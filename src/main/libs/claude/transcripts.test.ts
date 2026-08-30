import { EventEmitter } from 'events';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  default: {
    createReadStream: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn()
  }
}));

vi.mock('readline', () => ({
  default: {
    createInterface: vi.fn()
  }
}));

import fs from 'fs';
import readline from 'readline';

import { LOOKBACK_MS } from './usage';

import { readEntries } from './transcripts';

const mockReaddirSync = vi.mocked(fs.readdirSync);
const mockStatSync = vi.mocked(fs.statSync);
const mockCreateReadStream = vi.mocked(fs.createReadStream);
const mockCreateInterface = vi.mocked(readline.createInterface);

const CONFIG_DIR = '/config/dir';
const PROJECTS_DIR = `${CONFIG_DIR}/projects`;
const NOW = Date.UTC(2026, 0, 15, 0, 0, 0);
const CUTOFF = NOW - LOOKBACK_MS;

/**
 * A fake readline interface backed by a real EventEmitter, matching the
 * event-emitter API (`on('line' | 'close' | 'error', ...)`) that
 * readFileEntries actually subscribes to.
 */
const fakeInterface = () => {
  const emitter = new EventEmitter();
  mockCreateInterface.mockReturnValueOnce(emitter as unknown as ReturnType<typeof readline.createInterface>);
  return emitter;
};

/** Queues one fake readline interface per call to createInterface, each emitting the given lines then closing. */
const queueFileLines = (...linesPerFile: string[][]) => {
  for (const lines of linesPerFile) {
    const emitter = fakeInterface();
    // Emit asynchronously so the Promise executor in readFileEntries has
    // already attached its listeners before events fire.
    queueMicrotask(() => {
      for (const line of lines) emitter.emit('line', line);
      emitter.emit('close');
    });
  }
};

/** Sets up fs mocks for a projectsDir containing the given projects, each with the given transcript files. */
const setupProjectTree = (projects: Record<string, { files: string[]; mtimeMsByFile?: Record<string, number> }>) => {
  mockReaddirSync.mockImplementation((dir: unknown) => {
    if (dir === PROJECTS_DIR) return Object.keys(projects) as unknown as ReturnType<typeof fs.readdirSync>;
    for (const [project, config] of Object.entries(projects)) {
      if (dir === `${PROJECTS_DIR}/${project}`) return config.files as unknown as ReturnType<typeof fs.readdirSync>;
    }
    throw new Error(`ENOENT: unexpected readdirSync call for ${String(dir)}`);
  });

  mockStatSync.mockImplementation((p: unknown) => {
    const asString = String(p);

    for (const project of Object.keys(projects)) {
      if (asString === `${PROJECTS_DIR}/${project}`) {
        return { isDirectory: () => true } as unknown as ReturnType<typeof fs.statSync>;
      }
    }

    for (const [project, config] of Object.entries(projects)) {
      for (const file of config.files) {
        if (asString === `${PROJECTS_DIR}/${project}/${file}`) {
          const mtimeMs = config.mtimeMsByFile?.[file] ?? NOW;
          return { mtimeMs } as unknown as ReturnType<typeof fs.statSync>;
        }
      }
    }

    throw new Error(`ENOENT: unexpected statSync call for ${asString}`);
  });

  mockCreateReadStream.mockReturnValue({} as unknown as ReturnType<typeof fs.createReadStream>);
};

describe('readEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns no entries when the projects directory cannot be read', async () => {
    mockReaddirSync.mockImplementation(() => {
      throw new Error('ENOENT: no such directory');
    });

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('returns no entries when the projects directory is empty', async () => {
    setupProjectTree({});

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('skips a project entry that is not a directory', async () => {
    setupProjectTree({ notADir: { files: ['session.jsonl'] } });
    mockStatSync.mockImplementation((p: unknown) => {
      if (String(p) === `${PROJECTS_DIR}/notADir`) {
        return { isDirectory: () => false } as unknown as ReturnType<typeof fs.statSync>;
      }
      throw new Error(`ENOENT: unexpected statSync call for ${String(p)}`);
    });

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
    expect(mockCreateInterface).not.toHaveBeenCalled();
  });

  it('skips a project directory that cannot be listed and still reads the others', async () => {
    setupProjectTree({
      broken: { files: [] },
      good: { files: ['session.jsonl'] }
    });
    mockReaddirSync.mockImplementation((dir: unknown) => {
      if (dir === PROJECTS_DIR) return ['broken', 'good'] as unknown as ReturnType<typeof fs.readdirSync>;
      if (dir === `${PROJECTS_DIR}/broken`) throw new Error('EACCES: permission denied');
      if (dir === `${PROJECTS_DIR}/good`) return ['session.jsonl'] as unknown as ReturnType<typeof fs.readdirSync>;
      throw new Error(`ENOENT: unexpected readdirSync call for ${String(dir)}`);
    });

    const validLine = JSON.stringify({
      message: { model: 'claude-x', usage: { input_tokens: 10, output_tokens: 5 } },
      requestId: 'req-good',
      timestamp: new Date(NOW).toISOString(),
      type: 'assistant'
    });
    queueFileLines([validLine]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toHaveLength(1);
    expect(result[0].requestId).toBe('req-good');
  });

  it('ignores files that do not have a .jsonl extension', async () => {
    setupProjectTree({ proj: { files: ['notes.txt', 'readme.md'] } });

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
    expect(mockCreateInterface).not.toHaveBeenCalled();
  });

  it('excludes a transcript file whose mtime is older than the lookback window', async () => {
    setupProjectTree({
      proj: {
        files: ['old.jsonl'],
        mtimeMsByFile: { 'old.jsonl': CUTOFF - 1 }
      }
    });

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
    expect(mockCreateInterface).not.toHaveBeenCalled();
  });

  it('treats a file that cannot be stat-ed as not recent and excludes it', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    mockStatSync.mockImplementation((p: unknown) => {
      const asString = String(p);
      if (asString === `${PROJECTS_DIR}/proj`) return { isDirectory: () => true } as unknown as ReturnType<typeof fs.statSync>;
      if (asString === `${PROJECTS_DIR}/proj/session.jsonl`) throw new Error('ENOENT: file vanished');
      throw new Error(`ENOENT: unexpected statSync call for ${asString}`);
    });

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
    expect(mockCreateInterface).not.toHaveBeenCalled();
  });

  it('drops a line that does not start with an opening brace', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines(['not json at all']);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('drops a line whose JSON type is not assistant', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines([
      JSON.stringify({
        message: { model: 'claude-x', usage: { input_tokens: 10 } },
        timestamp: new Date(NOW).toISOString(),
        type: 'user'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('drops an assistant line that has no usage data', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines([
      JSON.stringify({
        message: { model: 'claude-x' },
        timestamp: new Date(NOW).toISOString(),
        type: 'assistant'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('drops an assistant line whose timestamp cannot be parsed', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines([
      JSON.stringify({
        message: { model: 'claude-x', usage: { input_tokens: 10 } },
        timestamp: 'not-a-real-timestamp',
        type: 'assistant'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('drops an assistant line that is missing a timestamp entirely', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines([
      JSON.stringify({
        message: { model: 'claude-x', usage: { input_tokens: 10 } },
        type: 'assistant'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('drops an assistant line whose usage tokens all sum to zero', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines([
      JSON.stringify({
        message: { model: 'claude-x', usage: { input_tokens: 0, output_tokens: 0 } },
        timestamp: new Date(NOW).toISOString(),
        type: 'assistant'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('drops a line that cannot be parsed as JSON even though it starts with a brace', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines(['{ this is not valid json']);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('parses a fully valid assistant line into a usage entry with summed token counts', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    const timestamp = new Date(NOW).toISOString();
    queueFileLines([
      JSON.stringify({
        message: {
          model: 'claude-opus-4-8',
          usage: {
            cache_creation_input_tokens: 3,
            cache_read_input_tokens: 2,
            input_tokens: 10,
            output_tokens: 5
          }
        },
        requestId: 'req-1',
        timestamp,
        type: 'assistant'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([
      {
        model: 'claude-opus-4-8',
        requestId: 'req-1',
        tokens: 20, // 10 + 5 + 2 + 3
        ts: Date.parse(timestamp)
      }
    ]);
  });

  it('defaults the model to "unknown" when the message has no model field', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    queueFileLines([
      JSON.stringify({
        message: { usage: { input_tokens: 10 } },
        timestamp: new Date(NOW).toISOString(),
        type: 'assistant'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('unknown');
  });

  it('excludes a parsed entry whose timestamp falls outside the lookback window even though its file is recent', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    const staleTimestamp = new Date(CUTOFF - 1000).toISOString();
    queueFileLines([
      JSON.stringify({
        message: { model: 'claude-x', usage: { input_tokens: 10 } },
        timestamp: staleTimestamp,
        type: 'assistant'
      })
    ]);

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([]);
  });

  it('aggregates a mix of valid and invalid lines across multiple projects and files', async () => {
    setupProjectTree({
      projA: { files: ['session1.jsonl', 'session2.jsonl'] },
      projB: { files: ['session3.jsonl'] }
    });

    const timestamp = new Date(NOW).toISOString();
    const validEntry = (requestId: string) =>
      JSON.stringify({
        message: { model: 'claude-x', usage: { input_tokens: 10 } },
        requestId,
        timestamp,
        type: 'assistant'
      });

    // File order follows readdirSync order: projA/session1, projA/session2, projB/session3.
    queueFileLines(
      ['not json', validEntry('a1')],
      [JSON.stringify({ type: 'user' }), validEntry('a2')],
      [validEntry('b1')]
    );

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result.map((e) => e.requestId).sort()).toEqual(['a1', 'a2', 'b1']);
  });

  it('resolves with whatever entries were collected so far when the read stream errors out', async () => {
    setupProjectTree({ proj: { files: ['session.jsonl'] } });
    const emitter = fakeInterface();
    const timestamp = new Date(NOW).toISOString();

    queueMicrotask(() => {
      emitter.emit(
        'line',
        JSON.stringify({
          message: { model: 'claude-x', usage: { input_tokens: 10 } },
          requestId: 'partial',
          timestamp,
          type: 'assistant'
        })
      );
      emitter.emit('error', new Error('stream exploded'));
    });

    const result = await readEntries(CONFIG_DIR, NOW);

    expect(result).toEqual([
      {
        model: 'claude-x',
        requestId: 'partial',
        tokens: 10,
        ts: Date.parse(timestamp)
      }
    ]);
  });
});
