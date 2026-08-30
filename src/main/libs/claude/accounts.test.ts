import path from 'path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  default: {
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn()
  }
}));

vi.mock('os', () => ({
  default: {
    homedir: vi.fn()
  }
}));

vi.mock('../childProcess', () => ({
  execAsync: vi.fn()
}));

import fs from 'fs';
import os from 'os';

import { execAsync } from '../childProcess';
import { detectClaudeCli, discoverAccounts } from './accounts';

const mockFs = vi.mocked(fs);
const mockOs = vi.mocked(os);
const mockExecAsync = vi.mocked(execAsync);

const HOME = '/fake/home';

// Builds a fs.statSync-style return value for a "recent" jsonl file.
const statFile = (mtimeMs: number) => ({ isDirectory: () => false, mtimeMs });
const statDir = () => ({ isDirectory: () => true, mtimeMs: 0 });

describe('accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectClaudeCli', () => {
    it('reports installed with a parsed version when execAsync resolves', async () => {
      mockExecAsync.mockResolvedValue('1.2.3 (Claude Code)\n');

      const result = await detectClaudeCli();

      expect(result).toEqual({ installed: true, version: '1.2.3' });
    });

    it('reports not installed when execAsync rejects', async () => {
      mockExecAsync.mockRejectedValue(new Error('command not found'));

      const result = await detectClaudeCli();

      expect(result).toEqual({ installed: false });
    });
  });

  describe('discoverAccounts', () => {
    it('returns an empty array when the home directory cannot be read', () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result).toEqual([]);
    });

    it('uses os.homedir() when no home directory argument is given', () => {
      mockOs.homedir.mockReturnValue('/mocked/home');
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = discoverAccounts();

      expect(mockOs.homedir).toHaveBeenCalled();
      expect(mockFs.readdirSync).toHaveBeenCalledWith('/mocked/home');
      expect(result).toEqual([]);
    });

    it('only considers .claude and .claude-* entries, filtering out unrelated names', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude', 'Documents', 'notes.txt'];
        if (p === path.join(HOME, '.claude', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude')) return statDir();
        if (p === path.join(HOME, '.claude', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result).toHaveLength(1);
      expect(result[0].dir).toBe(path.join(HOME, '.claude'));
      expect(result[0].label).toBe('claude');
    });

    it('excludes an account whose activity is older than the lookback window', () => {
      const STALE_MS = Date.now() - 40 * 24 * 60 * 60 * 1000; // 40 days ago

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-stale'];
        if (p === path.join(HOME, '.claude-stale', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude-stale', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-stale')) return statDir();
        if (p === path.join(HOME, '.claude-stale', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(STALE_MS);
        }
        throw new Error(`unexpected statSync(${p})`);
      });

      const result = discoverAccounts(HOME);

      expect(result).toEqual([]);
    });

    it('excludes an account with no .jsonl files under its projects', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-empty'];
        if (p === path.join(HOME, '.claude-empty', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude-empty', 'projects', 'proj1')) return ['readme.txt'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-empty')) return statDir();
        throw new Error(`unexpected statSync(${p})`);
      });

      const result = discoverAccounts(HOME);

      expect(result).toEqual([]);
    });

    it('excludes an account whose projects directory cannot be read', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-noprojects'];
        if (p === path.join(HOME, '.claude-noprojects', 'projects')) {
          throw new Error('ENOENT');
        }
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-noprojects')) return statDir();
        throw new Error(`unexpected statSync(${p})`);
      });

      const result = discoverAccounts(HOME);

      expect(result).toEqual([]);
    });

    it('skips a project subdirectory that cannot be read, without crashing', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude'];
        if (p === path.join(HOME, '.claude', 'projects')) return ['broken', 'proj1'];
        if (p === path.join(HOME, '.claude', 'projects', 'broken')) {
          throw new Error('EACCES');
        }
        if (p === path.join(HOME, '.claude', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude')) return statDir();
        if (p === path.join(HOME, '.claude', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result).toHaveLength(1);
    });

    it('excludes a candidate dir whose statSync call throws, without crashing', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-badstat', '.claude'];
        if (p === path.join(HOME, '.claude', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-badstat')) throw new Error('ENOENT');
        if (p === path.join(HOME, '.claude')) return statDir();
        if (p === path.join(HOME, '.claude', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result).toHaveLength(1);
      expect(result[0].dir).toBe(path.join(HOME, '.claude'));
    });

    it('sorts .claude first, then remaining .claude-* accounts alphabetically', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-zeta', '.claude-alpha', '.claude'];
        if (p.endsWith(path.join('projects'))) return ['proj1'];
        if (p.endsWith(path.join('projects', 'proj1'))) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p.endsWith('session1.jsonl')) return statFile(Date.now());
        return statDir();
      });
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result.map((a) => a.label)).toEqual(['claude', 'claude-alpha', 'claude-zeta']);
    });

    it('populates email, org and a known plan label from the in-dir .claude.json', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude'];
        if (p === path.join(HOME, '.claude', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude')) return statDir();
        if (p === path.join(HOME, '.claude', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude', '.claude.json')) {
          return JSON.stringify({
            oauthAccount: {
              emailAddress: 'dev@example.com',
              organizationName: 'TegoAI',
              userRateLimitTier: 'default_claude_max_5x'
            }
          });
        }
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        email: 'dev@example.com',
        org: 'TegoAI',
        plan: 'Max 5×'
      });
    });

    it('falls back to a humanized plan string for an unrecognized tier', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude'];
        if (p === path.join(HOME, '.claude', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude')) return statDir();
        if (p === path.join(HOME, '.claude', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude', '.claude.json')) {
          return JSON.stringify({
            oauthAccount: { userRateLimitTier: 'custom_tier_x' }
          });
        }
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result[0].plan).toBe('custom tier x');
    });

    it('falls back to displayName or fullName for org when organizationName is absent', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude'];
        if (p === path.join(HOME, '.claude', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude')) return statDir();
        if (p === path.join(HOME, '.claude', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude', '.claude.json')) {
          return JSON.stringify({
            oauthAccount: { displayName: 'Jane Doe' }
          });
        }
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result[0].org).toBe('Jane Doe');
    });

    it('reads the sibling <dir>.json when the in-dir .claude.json is unreadable', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-b'];
        if (p === path.join(HOME, '.claude-b', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude-b', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-b')) return statDir();
        if (p === path.join(HOME, '.claude-b', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (p === `${path.join(HOME, '.claude-b')}.json`) {
          return JSON.stringify({
            oauthAccount: { emailAddress: 'sibling@example.com' }
          });
        }
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result[0].email).toBe('sibling@example.com');
    });

    it('produces a bare profile (label/dir only) when no config json is readable', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-b'];
        if (p === path.join(HOME, '.claude-b', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude-b', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-b')) return statDir();
        if (p === path.join(HOME, '.claude-b', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result).toEqual([{ dir: path.join(HOME, '.claude-b'), label: 'claude-b' }]);
    });

    it('returns no profile fields when the config json has no oauthAccount', () => {
      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === HOME) return ['.claude-b'];
        if (p === path.join(HOME, '.claude-b', 'projects')) return ['proj1'];
        if (p === path.join(HOME, '.claude-b', 'projects', 'proj1')) return ['session1.jsonl'];
        throw new Error(`unexpected readdirSync(${p})`);
      });
      mockFs.statSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-b')) return statDir();
        if (p === path.join(HOME, '.claude-b', 'projects', 'proj1', 'session1.jsonl')) {
          return statFile(Date.now());
        }
        throw new Error(`unexpected statSync(${p})`);
      });
      mockFs.readFileSync.mockImplementation((p: string) => {
        if (p === path.join(HOME, '.claude-b', '.claude.json')) {
          return JSON.stringify({ someOtherKey: true });
        }
        throw new Error('ENOENT');
      });

      const result = discoverAccounts(HOME);

      expect(result).toEqual([{ dir: path.join(HOME, '.claude-b'), label: 'claude-b' }]);
    });
  });
});
