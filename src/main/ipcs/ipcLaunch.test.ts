import { describe, it, expect, vi, beforeEach } from 'vitest';

const handlers: Record<string, (...args: any[]) => any> = {};

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: any) => {
      handlers[channel] = handler;
    })
  }
}));

vi.mock('../libs/integrations/editrosLaunch', () => ({
  launchExternalEditor: vi.fn()
}));

vi.mock('../libs/integrations/shellsLaunch', () => ({
  launch: vi.fn()
}));

import { launchExternalEditor } from '../libs/integrations/editrosLaunch';
import { launch } from '../libs/integrations/shellsLaunch';

await import('./ipcLaunch');

const mockLaunchEditor = vi.mocked(launchExternalEditor);
const mockLaunchShell = vi.mocked(launch);

describe('ipcLaunch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('launch:editor', () => {
    it('should call launchExternalEditor with correct arguments', async () => {
      const editor = { editor: 'VS Code', path: '/Applications/VSCode.app' };

      await handlers['launch:editor']({}, { editor, fullPath: '/Users/test/project' });

      expect(mockLaunchEditor).toHaveBeenCalledWith('/Users/test/project', editor);
    });
  });

  describe('launch:shell', () => {
    it('should call launch with correct arguments', async () => {
      const shell = { path: '/Applications/Terminal.app', shell: 'Terminal' };

      await handlers['launch:shell']({}, { fullPath: '/Users/test/project', shell });

      expect(mockLaunchShell).toHaveBeenCalledWith(shell, '/Users/test/project');
    });
  });
});
