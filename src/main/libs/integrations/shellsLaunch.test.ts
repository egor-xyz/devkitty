import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({ pid: 1234 }))
}));

import { spawn } from 'child_process';
import { launch, Shell } from './shellsLaunch';

const mockSpawn = vi.mocked(spawn);

describe('shellsLaunch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('launch', () => {
    it('should launch Kitty with --single-instance and --directory flags', () => {
      const foundShell = { path: '/Applications/Kitty.app', shell: Shell.Kitty };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('/Applications/Kitty.app', [
        '--single-instance',
        '--directory',
        '/some/path'
      ]);
    });

    it('should launch Alacritty with --working-directory flag', () => {
      const foundShell = { path: '/Applications/Alacritty.app', shell: Shell.Alacritty };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('/Applications/Alacritty.app', ['--working-directory', '/some/path']);
    });

    it('should launch Tabby with open command', () => {
      const foundShell = { path: '/Applications/Tabby.app', shell: Shell.Tabby };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('/Applications/Tabby.app', ['open', '/some/path']);
    });

    it('should launch WezTerm with start --cwd flags', () => {
      const foundShell = { path: '/Applications/WezTerm.app', shell: Shell.WezTerm };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('/Applications/WezTerm.app', ['start', '--cwd', '/some/path']);
    });

    it('should launch Ghostty using open -b with bundle ID', () => {
      const foundShell = { path: '/Applications/Ghostty.app', shell: Shell.Ghostty };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('open', ['-b', 'com.mitchellh.ghostty', '/some/path']);
    });

    it('should launch Terminal using open -b with bundle ID', () => {
      const foundShell = { path: '/Applications/Terminal.app', shell: Shell.Terminal };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('open', ['-b', 'com.apple.Terminal', '/some/path']);
    });

    it('should launch iTerm2 using open -b with bundle ID', () => {
      const foundShell = { path: '/Applications/iTerm2.app', shell: Shell.iTerm2 };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('open', ['-b', 'com.googlecode.iterm2', '/some/path']);
    });

    it('should launch Hyper using open -b with bundle ID', () => {
      const foundShell = { path: '/Applications/Hyper.app', shell: Shell.Hyper };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('open', ['-b', 'co.zeit.hyper', '/some/path']);
    });

    it('should launch Warp using open -b with bundle ID', () => {
      const foundShell = { path: '/Applications/Warp.app', shell: Shell.Warp };

      launch(foundShell, '/some/path');

      expect(mockSpawn).toHaveBeenCalledWith('open', ['-b', 'dev.warp.Warp-Stable', '/some/path']);
    });

    it('should return the spawned child process', () => {
      const foundShell = { path: '/Applications/Terminal.app', shell: Shell.Terminal };

      const result = launch(foundShell, '/some/path');

      expect(result).toEqual({ pid: 1234 });
    });
  });
});
