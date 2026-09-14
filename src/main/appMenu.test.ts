import type { MenuItemConstructorOptions } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;

const mock = vi.hoisted(() => {
  const window = {
    focus: vi.fn(),
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    show: vi.fn()
  };
  return {
    buildFromTemplate: vi.fn((template: MenuItemConstructorOptions[]) => template),
    checkForUpdatesManually: vi.fn(),
    getAllWindows: vi.fn(() => [window]),
    getFocusedWindow: vi.fn(() => window),
    setApplicationMenu: vi.fn(),
    showMessageBox: vi.fn(async () => ({ response: 0 })),
    window
  };
});

vi.mock('electron', () => ({
  app: { name: 'Devkitty' },
  BrowserWindow: {
    getAllWindows: mock.getAllWindows,
    getFocusedWindow: mock.getFocusedWindow
  },
  dialog: { showMessageBox: mock.showMessageBox },
  Menu: { buildFromTemplate: mock.buildFromTemplate, setApplicationMenu: mock.setApplicationMenu }
}));
vi.mock('./ipcs/ipcUpdater', () => ({ checkForUpdatesManually: mock.checkForUpdatesManually }));

const install = async (): Promise<MenuItemConstructorOptions[]> => {
  const { installAppMenu } = await import('./appMenu');
  installAppMenu();
  return mock.buildFromTemplate.mock.calls[0][0];
};

const clickCheck = async (template: MenuItemConstructorOptions[]): Promise<void> => {
  const appMenu = template[0].submenu as MenuItemConstructorOptions[];
  const click = appMenu[1].click!;
  click({} as never, {} as never, {} as never);
  await vi.waitFor(() => {
    expect(mock.checkForUpdatesManually).toHaveBeenCalledTimes(1);
    expect(mock.showMessageBox.mock.calls.length + mock.window.focus.mock.calls.length).toBeGreaterThan(0);
  });
};

describe('macOS app menu', () => {
  beforeEach(() => {
    Object.defineProperty(process, 'platform', { ...platformDescriptor, value: 'darwin' });
    vi.resetModules();
    vi.clearAllMocks();
    mock.checkForUpdatesManually.mockResolvedValue({ status: 'idle' });
    mock.getFocusedWindow.mockReturnValue(mock.window);
    mock.getAllWindows.mockReturnValue([mock.window]);
    mock.window.isMinimized.mockReturnValue(false);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', platformDescriptor);
  });

  it('puts Check For Updates below About and keeps native menu roles', async () => {
    const template = await install();
    expect(mock.setApplicationMenu).toHaveBeenCalledWith(template);
    expect(template.map((item) => item.role ?? item.label)).toEqual([
      'Devkitty', 'fileMenu', 'editMenu', 'viewMenu', 'windowMenu', 'help'
    ]);
    const appMenu = template[0].submenu as MenuItemConstructorOptions[];
    expect(appMenu.map((item) => item.role ?? item.label ?? item.type)).toEqual([
      'about', 'Check For Updates...', 'separator', 'services', 'separator',
      'hide', 'hideOthers', 'unhide', 'separator', 'quit'
    ]);
  });

  it('does not replace the application menu outside macOS', async () => {
    Object.defineProperty(process, 'platform', { ...platformDescriptor, value: 'linux' });
    const { installAppMenu } = await import('./appMenu');
    installAppMenu();
    expect(mock.buildFromTemplate).not.toHaveBeenCalled();
    expect(mock.setApplicationMenu).not.toHaveBeenCalled();
  });

  it('shows a closable result when Devkitty is current', async () => {
    const template = await install();
    await clickCheck(template);
    expect(mock.showMessageBox).toHaveBeenCalledWith(mock.window, expect.objectContaining({
      buttons: ['OK'], message: 'Devkitty is up to date.', type: 'info'
    }));
  });

  it('shows an error when a check fails', async () => {
    mock.checkForUpdatesManually.mockResolvedValue({ error: 'Network lost', status: 'error' });
    const template = await install();
    await clickCheck(template);
    expect(mock.showMessageBox).toHaveBeenCalledWith(mock.window, expect.objectContaining({
      buttons: ['OK'], detail: 'Network lost', type: 'error'
    }));
  });

  it('explains that checks need an installed app in development', async () => {
    mock.checkForUpdatesManually.mockResolvedValue('unsupported');
    const template = await install();
    await clickCheck(template);
    expect(mock.showMessageBox).toHaveBeenCalledWith(mock.window, expect.objectContaining({
      buttons: ['OK'], message: 'Check for updates in an installed macOS app.'
    }));
  });

  it.each(['available', 'downloading', 'ready'] as const)('focuses the app for a %s update without a dialog', async (status) => {
    mock.checkForUpdatesManually.mockResolvedValue({ status, version: '4.6.0' });
    mock.window.isMinimized.mockReturnValue(true);
    const template = await install();
    await clickCheck(template);
    expect(mock.window.restore).toHaveBeenCalled();
    expect(mock.window.show).toHaveBeenCalled();
    expect(mock.window.focus).toHaveBeenCalled();
    expect(mock.showMessageBox).not.toHaveBeenCalled();
  });
});
