import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({ pid: 1234 }))
}));

vi.mock('./path-exists', () => ({
  pathExists: vi.fn()
}));

import { spawn } from 'child_process';

import { ExternalEditorError, type FoundEditor } from '../../../types/foundEditor';
import { launchExternalEditor } from './editrosLaunch';
import { pathExists } from './path-exists';

const mockSpawn = vi.mocked(spawn);
const mockPathExists = vi.mocked(pathExists);

describe('editorsLaunch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('launchExternalEditor', () => {
    it('should throw ExternalEditorError when editor path does not exist', async () => {
      mockPathExists.mockResolvedValueOnce(false);

      const editor: FoundEditor = { editor: 'VS Code', path: '/Applications/VSCode.app' };

      await expect(launchExternalEditor('/some/project', editor)).rejects.toThrow(ExternalEditorError);
    });

    it('should include openPreferences in error metadata when path does not exist', async () => {
      mockPathExists.mockResolvedValueOnce(false);

      const editor: FoundEditor = { editor: 'VS Code', path: '/Applications/VSCode.app' };

      try {
        await launchExternalEditor('/some/project', editor);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ExternalEditorError);
        expect((e as ExternalEditorError).metadata.openPreferences).toBe(true);
      }
    });

    it('should launch editor with shell when usesShell is true', async () => {
      mockPathExists.mockResolvedValueOnce(true);

      const editor: FoundEditor = {
        editor: 'Custom Editor',
        path: '/usr/bin/custom-editor',
        usesShell: true
      };

      await launchExternalEditor('/some/project', editor);

      expect(mockSpawn).toHaveBeenCalledWith('"/usr/bin/custom-editor"', ['"/some/project"'], {
        detached: true,
        shell: true
      });
    });

    it('should launch with open -a on macOS for standard editors', async () => {
      mockPathExists.mockResolvedValueOnce(true);

      const editor: FoundEditor = {
        editor: 'Visual Studio Code',
        path: '/Applications/Visual Studio Code.app'
      };

      await launchExternalEditor('/some/project', editor);

      expect(mockSpawn).toHaveBeenCalledWith(
        'open',
        ['-a', '/Applications/Visual Studio Code.app', '/some/project'],
        { detached: true }
      );
    });

    it('should check if the editor path exists before launching', async () => {
      mockPathExists.mockResolvedValueOnce(true);

      const editor: FoundEditor = {
        editor: 'Zed',
        path: '/Applications/Zed.app'
      };

      await launchExternalEditor('/some/project', editor);

      expect(mockPathExists).toHaveBeenCalledWith('/Applications/Zed.app');
    });
  });
});
