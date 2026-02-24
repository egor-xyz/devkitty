import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn()
};

const mockContextBridge = {
  exposeInMainWorld: vi.fn()
};

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer
}));

// Import the module which triggers the side effect of calling exposeInMainWorld
await import('./index');

// Capture the bridge object that was passed to exposeInMainWorld
const bridge: Record<string, any> = mockContextBridge.exposeInMainWorld.mock.calls[0][1];

describe('preload bridge', () => {
  beforeEach(() => {
    // Only clear ipcRenderer mocks, not contextBridge (bridge was captured above)
    mockIpcRenderer.invoke.mockClear();
    mockIpcRenderer.on.mockClear();
  });

  it('should expose bridge on window via contextBridge', () => {
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith('bridge', expect.any(Object));
  });

  describe('darkMode', () => {
    it('should invoke dark-mode:set with theme', () => {
      bridge.darkMode.set('dark');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dark-mode:set', 'dark');
    });

    it('should invoke dark-mode:toggle', () => {
      bridge.darkMode.toggle();
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('dark-mode:toggle');
    });

    it('should listen for theme-changed events', () => {
      const callback = vi.fn();
      bridge.darkMode.on(callback);
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('theme-changed', callback);
    });
  });

  describe('git', () => {
    it('should invoke git:getStatus with id', () => {
      bridge.git.getStatus('proj-1');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:getStatus', 'proj-1');
    });

    it('should invoke git:checkout with id and branch', () => {
      bridge.git.checkout('proj-1', 'develop');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:checkout', 'proj-1', 'develop');
    });

    it('should invoke git:pull with id', () => {
      bridge.git.pull('proj-1');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:pull', 'proj-1');
    });

    it('should invoke git:reset with id, target, and force', () => {
      bridge.git.reset('proj-1', 'main', true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:reset', 'proj-1', 'main', true);
    });

    it('should invoke git:mergeTo with id, from, and to', () => {
      bridge.git.mergeTo('proj-1', 'feature', 'main');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:mergeTo', 'proj-1', 'feature', 'main');
    });
  });

  describe('gitAPI', () => {
    it('should invoke git:api:getAction with id and filterBy', () => {
      bridge.gitAPI.getAction('proj-1', ['main']);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:api:getAction', 'proj-1', ['main']);
    });

    it('should invoke git:api:getJobs with id and runId', () => {
      bridge.gitAPI.getJobs('proj-1', 12345);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:api:getJobs', 'proj-1', 12345);
    });

    it('should invoke git:api:getPulls with id and type', () => {
      bridge.gitAPI.getPulls('proj-1', 'author');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:api:getPulls', 'proj-1', 'author');
    });

    it('should invoke git:api:reset with id, origin, and target', () => {
      bridge.gitAPI.reset('proj-1', 'feature', 'main');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:api:reset', 'proj-1', 'feature', 'main');
    });
  });

  describe('launch', () => {
    it('should invoke launch:editor with fullPath and editor', () => {
      const editor = { editor: 'VS Code', path: '/Applications/VSCode.app' };
      bridge.launch.editor('/some/project', editor);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('launch:editor', {
        editor,
        fullPath: '/some/project'
      });
    });

    it('should invoke launch:shell with fullPath and shell', () => {
      const shell = { path: '/Applications/Terminal.app', shell: 'Terminal' };
      bridge.launch.shell('/some/project', shell);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('launch:shell', {
        fullPath: '/some/project',
        shell
      });
    });
  });

  describe('projects', () => {
    it('should invoke projects:get', () => {
      bridge.projects.get();
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('projects:get');
    });

    it('should invoke projects:add', () => {
      bridge.projects.add();
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('projects:add');
    });

    it('should invoke projects:remove with id', () => {
      bridge.projects.remove('proj-1');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('projects:remove', 'proj-1');
    });

    it('should invoke projects:update with project', () => {
      const project = { filePath: '/path', id: '1', name: 'test' };
      bridge.projects.update(project);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('projects:update', project);
    });
  });

  describe('settings', () => {
    it('should invoke settings:get with key', () => {
      bridge.settings.get('appSettings');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('settings:get', 'appSettings');
    });

    it('should invoke settings:set with key, value, and optional safe flag', () => {
      bridge.settings.set('appSettings', { fetchInterval: 5000 }, true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('settings:set', 'appSettings', { fetchInterval: 5000 }, true);
    });

    it('should listen for settings:updated events', () => {
      const callback = vi.fn();
      bridge.settings.onAppSettings(callback);
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('settings:updated', callback);
    });
  });

  describe('sticker', () => {
    it('should invoke sticker:add with text', () => {
      bridge.sticker.add('Hello World');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('sticker:add', 'Hello World');
    });
  });

  describe('worktree', () => {
    it('should invoke git:worktree:list with id', () => {
      bridge.worktree.list('proj-1');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('git:worktree:list', 'proj-1');
    });

    it('should invoke git:worktree:add with id, repoName, branch', () => {
      bridge.worktree.add('proj-1', 'my-repo', 'feature');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'git:worktree:add',
        'proj-1',
        'my-repo',
        'feature',
        undefined
      );
    });

    it('should invoke git:worktree:add with newBranch when provided', () => {
      bridge.worktree.add('proj-1', 'my-repo', 'main', 'new-feature');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'git:worktree:add',
        'proj-1',
        'my-repo',
        'main',
        'new-feature'
      );
    });

    it('should invoke git:worktree:remove with id and path', () => {
      bridge.worktree.remove('proj-1', '/path/to/worktree');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'git:worktree:remove',
        'proj-1',
        '/path/to/worktree',
        undefined
      );
    });

    it('should invoke git:worktree:remove with force flag', () => {
      bridge.worktree.remove('proj-1', '/path/to/worktree', true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
        'git:worktree:remove',
        'proj-1',
        '/path/to/worktree',
        true
      );
    });
  });
});
