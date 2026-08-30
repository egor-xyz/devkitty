import os from 'os';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// integrations.ts only imports a type from 'electron', but this mock is kept as a safety net
// in case any transitive import ever needs the module resolved.
vi.mock('electron', () => ({}));

vi.mock('./getInstalledApps', () => ({
  getInstalledApps: vi.fn()
}));

vi.mock('../../settings', () => ({
  settings: {
    get: vi.fn(),
    set: vi.fn()
  }
}));

import { getInstalledApps } from './getInstalledApps';
import { updateEditorsAndShells } from './integrations';
import { settings } from '../../settings';

const mockGetInstalledApps = vi.mocked(getInstalledApps);
const mockSettings = vi.mocked(settings);

const createMainWindow = () =>
  ({
    webContents: {
      send: vi.fn()
    }
  }) as unknown as Electron.BrowserWindow;

type SettingsMap = Record<string, unknown>;

const mockSettingsGetWith = (overrides: SettingsMap) => {
  mockSettings.get.mockImplementation(((key: string) => overrides[key]) as typeof settings.get);
};

describe('updateEditorsAndShells', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInstalledApps.mockResolvedValue([]);
    mockSettingsGetWith({});
  });

  it('should detect installed editors that match known editor application names and persist them to settings', async () => {
    mockGetInstalledApps.mockImplementation(async (directory: string) => {
      if (directory === '/Applications') {
        return ['/Applications/Visual Studio Code.app', '/Applications/SomeUnknownApp.app'];
      }
      return [];
    });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.editors', [
      { editor: 'Visual Studio Code', path: '/Applications/Visual Studio Code.app' }
    ]);
  });

  it('should combine applications discovered in /Applications and in the user home Applications directory when detecting editors', async () => {
    mockGetInstalledApps.mockImplementation(async (directory: string) => {
      if (directory === '/Applications') {
        return ['/Applications/Visual Studio Code.app'];
      }
      return [`${directory}/Zed.app`];
    });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockGetInstalledApps).toHaveBeenCalledWith('/Applications');
    expect(mockGetInstalledApps).toHaveBeenCalledWith(`${os.homedir()}/Applications`);
    expect(mockGetInstalledApps).toHaveBeenCalledTimes(2);

    const editorsCall = mockSettings.set.mock.calls.find((call) => call[0] === 'appSettings.editors');
    expect(editorsCall?.[1]).toEqual([
      { editor: 'Visual Studio Code', path: '/Applications/Visual Studio Code.app' },
      { editor: 'Zed', path: `${os.homedir()}/Applications/Zed.app` }
    ]);
  });

  it('should select the first detected editor as the selected editor when no editor is currently selected', async () => {
    mockGetInstalledApps.mockImplementation(async (directory: string) => {
      if (directory === '/Applications') {
        return ['/Applications/Visual Studio Code.app', '/Applications/WebStorm.app'];
      }
      return [];
    });
    mockSettingsGetWith({ 'appSettings.selectedEditor': undefined });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.selectedEditor', {
      editor: 'Visual Studio Code',
      path: '/Applications/Visual Studio Code.app'
    });
  });

  it('should select the first detected editor when the currently selected editor is no longer among the detected editors', async () => {
    mockGetInstalledApps.mockImplementation(async (directory: string) => {
      if (directory === '/Applications') {
        return ['/Applications/Visual Studio Code.app'];
      }
      return [];
    });
    mockSettingsGetWith({
      'appSettings.selectedEditor': { editor: 'WebStorm', path: '/Applications/WebStorm.app' }
    });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.selectedEditor', {
      editor: 'Visual Studio Code',
      path: '/Applications/Visual Studio Code.app'
    });
  });

  it('should not overwrite the selected editor when it is deep-equal (via lodash isEqual) to one of the detected editors', async () => {
    mockGetInstalledApps.mockImplementation(async (directory: string) => {
      if (directory === '/Applications') {
        return ['/Applications/Visual Studio Code.app'];
      }
      return [];
    });
    // A different object reference with the same shape, to prove the comparison uses
    // lodash's deep isEqual rather than reference equality.
    mockSettingsGetWith({
      'appSettings.selectedEditor': { editor: 'Visual Studio Code', path: '/Applications/Visual Studio Code.app' }
    });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    const selectedEditorCall = mockSettings.set.mock.calls.find((call) => call[0] === 'appSettings.selectedEditor');
    expect(selectedEditorCall).toBeUndefined();
  });

  it('should detect installed shells and always append the default macOS Terminal application', async () => {
    mockGetInstalledApps.mockImplementation(async (directory: string) => {
      if (directory === '/Applications') {
        return ['/Applications/iTerm2.app'];
      }
      return [];
    });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.shells', [
      { path: '/Applications/iTerm2.app', shell: 'iTerm2' },
      { path: '/Applications/Utilities/Terminal.app', shell: 'Terminal' }
    ]);
  });

  it('should select the first detected shell as the selected shell when no shell is currently selected', async () => {
    mockGetInstalledApps.mockImplementation(async (directory: string) => {
      if (directory === '/Applications') {
        return ['/Applications/iTerm2.app'];
      }
      return [];
    });
    mockSettingsGetWith({ 'appSettings.selectedShell': undefined });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.selectedShell', {
      path: '/Applications/iTerm2.app',
      shell: 'iTerm2'
    });
  });

  it('should not overwrite the selected shell when it is deep-equal to one of the detected shells', async () => {
    mockGetInstalledApps.mockResolvedValue([]);
    // No app matches, so the only detected shell is the always-appended default Terminal.
    mockSettingsGetWith({
      'appSettings.selectedShell': { path: '/Applications/Utilities/Terminal.app', shell: 'Terminal' }
    });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    const selectedShellCall = mockSettings.set.mock.calls.find((call) => call[0] === 'appSettings.selectedShell');
    expect(selectedShellCall).toBeUndefined();
  });

  it('should select the first detected shell when the currently selected shell is no longer among the detected shells', async () => {
    mockGetInstalledApps.mockResolvedValue([]);
    mockSettingsGetWith({
      'appSettings.selectedShell': { path: '/Applications/Warp.app', shell: 'Warp' }
    });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.selectedShell', {
      path: '/Applications/Utilities/Terminal.app',
      shell: 'Terminal'
    });
  });

  it('should persist an empty editors array when no installed application matches a known editor name', async () => {
    mockGetInstalledApps.mockResolvedValue(['/Applications/RandomApp.app']);

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.editors', []);
  });

  it('should still persist the default Terminal shell when no other installed application matches a known shell name', async () => {
    mockGetInstalledApps.mockResolvedValue([]);

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mockSettings.set).toHaveBeenCalledWith('appSettings.shells', [
      { path: '/Applications/Utilities/Terminal.app', shell: 'Terminal' }
    ]);
  });

  it('should send the current appSettings value to the renderer through mainWindow.webContents.send', async () => {
    mockGetInstalledApps.mockResolvedValue([]);
    const appSettingsValue = { fetchInterval: 10000, theme: 'sunset' };
    mockSettingsGetWith({ appSettings: appSettingsValue });

    const mainWindow = createMainWindow();
    await updateEditorsAndShells(mainWindow);

    expect(mainWindow.webContents.send).toHaveBeenCalledWith('settings:updated', appSettingsValue);
    expect(mainWindow.webContents.send).toHaveBeenCalledTimes(1);
  });
});
