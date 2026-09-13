import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => {
  const listeners: Record<string, (...args: unknown[]) => void> = {};
  const handlers: Record<string, (...args: unknown[]) => unknown> = {};
  const app = { isPackaged: true };
  const window = { isDestroyed: vi.fn(() => false), webContents: { send: vi.fn() } };
  const updater = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkForUpdates: vi.fn(async () => undefined),
    downloadUpdate: vi.fn(async () => []),
    logger: undefined as unknown,
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => { listeners[event] = listener; }),
    quitAndInstall: vi.fn()
  };
  return { app, getSettings: vi.fn(), handlers, listeners, onDidChange: vi.fn(), updater, window };
});

vi.mock('electron', () => ({
  app: mock.app,
  BrowserWindow: { getAllWindows: () => [mock.window] },
  ipcMain: { handle: (channel: string, handler: (...args: unknown[]) => unknown) => { mock.handlers[channel] = handler; } }
}));
vi.mock('electron-updater', () => ({ default: { autoUpdater: mock.updater } }));
vi.mock('electron-log', () => ({ default: { error: vi.fn() } }));
vi.mock('../settings', () => ({ settings: { get: mock.getSettings, onDidChange: mock.onDidChange } }));

const flush = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };

const setup = async (autoUpdate?: boolean): Promise<void> => {
  mock.getSettings.mockReturnValue({ autoUpdate });
  const { startUpdater } = await import('./ipcUpdater');
  startUpdater();
  await flush();
};

describe('ipcUpdater', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const key of Object.keys(mock.handlers)) delete mock.handlers[key];
    for (const key of Object.keys(mock.listeners)) delete mock.listeners[key];
    mock.updater.autoDownload = true;
    mock.updater.autoInstallOnAppQuit = true;
    mock.app.isPackaged = true;
    vi.spyOn(globalThis, 'setInterval').mockReturnValue(1 as unknown as ReturnType<typeof setInterval>);
  });

  it('checks only after startup, with auto-download off and no native dialog', async () => {
    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
    });
    await setup(false);

    expect(mock.updater.autoDownload).toBe(false);
    expect(mock.updater.autoInstallOnAppQuit).toBe(false);
    expect(mock.updater.downloadUpdate).not.toHaveBeenCalled();
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'available', version: '4.5.0' });
    expect(mock.window.webContents.send).toHaveBeenCalledWith('updater:state', { status: 'available', version: '4.5.0' });
    expect(mock.handlers['updater:install']()).toBeUndefined();
    expect(mock.updater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('does not check or download in an unpackaged app', async () => {
    mock.app.isPackaged = false;
    await setup(false);
    await mock.handlers['updater:download']();
    expect(mock.updater.checkForUpdates).not.toHaveBeenCalled();
    expect(mock.updater.downloadUpdate).not.toHaveBeenCalled();
  });

  it('downloads once on click, then installs only after the downloaded event', async () => {
    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
    });
    let finishDownload!: (files: string[]) => void;
    mock.updater.downloadUpdate.mockImplementationOnce(() => new Promise((resolve) => { finishDownload = resolve; }));
    await setup(false);

    const first = mock.handlers['updater:download']();
    const second = mock.handlers['updater:download']();
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'downloading', version: '4.5.0' });
    expect(mock.updater.downloadUpdate).toHaveBeenCalledTimes(1);
    mock.handlers['updater:install']();
    expect(mock.updater.quitAndInstall).not.toHaveBeenCalled();

    mock.listeners['update-downloaded']({ version: '4.5.0' });
    finishDownload([]);
    await Promise.all([first, second]);
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'ready', version: '4.5.0' });
    mock.handlers['updater:install']();
    mock.handlers['updater:install']();
    expect(mock.updater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('keeps a manual download active when an earlier check reports an update', async () => {
    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
    });
    let finishCheck!: () => void;
    mock.updater.checkForUpdates.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishCheck = () => {
        mock.listeners['update-available']({ version: '4.5.0' });
        resolve();
      };
    }));
    let finishDownload!: (files: string[]) => void;
    mock.updater.downloadUpdate.mockImplementationOnce(() => new Promise((resolve) => { finishDownload = resolve; }));
    await setup(false);

    const periodicCheck = vi.mocked(setInterval).mock.calls[0][0] as () => void;
    periodicCheck();
    await flush();
    const first = mock.handlers['updater:download']();
    finishCheck();
    await flush();
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'downloading', version: '4.5.0' });

    mock.listeners['update-not-available']();
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'downloading', version: '4.5.0' });
    await mock.handlers['updater:download']();
    expect(mock.updater.downloadUpdate).toHaveBeenCalledTimes(1);

    mock.listeners['update-downloaded']({ version: '4.5.0' });
    finishDownload([]);
    await first;
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'ready', version: '4.5.0' });
  });

  it('starts an automatic download and lets a new window read the ready state', async () => {
    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
      mock.listeners['update-downloaded']({ version: '4.5.0' });
    });
    await setup();
    expect(mock.updater.autoDownload).toBe(true);
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'ready', version: '4.5.0' });
    expect(mock.updater.downloadUpdate).not.toHaveBeenCalled();
  });

  it('starts a download when auto-update is switched on', async () => {
    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
    });
    await setup(false);
    mock.onDidChange.mock.calls[0][1]({ autoUpdate: true });
    await flush();
    expect(mock.updater.downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows a check error and retries from the button', async () => {
    mock.updater.checkForUpdates.mockRejectedValueOnce(new Error('network error'));
    await setup(false);
    expect(mock.handlers['updater:getState']()).toEqual({ error: 'network error', status: 'error', version: undefined });

    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
    });
    await mock.handlers['updater:download']();
    expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(2);
    expect(mock.updater.downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it('shows a download error and retries without another check', async () => {
    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
    });
    mock.updater.downloadUpdate.mockRejectedValueOnce(new Error('download failed'));
    await setup(false);
    await mock.handlers['updater:download']();
    expect(mock.handlers['updater:getState']()).toEqual({ error: 'download failed', status: 'error', version: '4.5.0' });
    await mock.handlers['updater:download']();
    expect(mock.updater.downloadUpdate).toHaveBeenCalledTimes(2);
    expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('allows another install after a native install error and retry', async () => {
    mock.updater.checkForUpdates.mockImplementationOnce(async () => {
      mock.listeners['update-available']({ version: '4.5.0' });
    });
    mock.updater.downloadUpdate.mockImplementation(async () => {
      mock.listeners['update-downloaded']({ version: '4.5.0' });
      return [];
    });
    await setup(false);

    await mock.handlers['updater:download']();
    mock.handlers['updater:install']();
    expect(mock.updater.quitAndInstall).toHaveBeenCalledTimes(1);

    mock.listeners.error(new Error('install failed'));
    expect(mock.handlers['updater:getState']()).toEqual({ error: 'install failed', status: 'error', version: '4.5.0' });
    await mock.handlers['updater:download']();
    expect(mock.handlers['updater:getState']()).toEqual({ status: 'ready', version: '4.5.0' });
    mock.handlers['updater:install']();
    expect(mock.updater.quitAndInstall).toHaveBeenCalledTimes(2);
  });
});
