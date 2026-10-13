import { EventEmitter } from 'events';
import os from 'os';
import path from 'path';
import { PassThrough } from 'stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({ spawn: vi.fn() }));

import { spawn } from 'child_process';

import {
  clearCliUsageCache,
  CLI_USAGE_ARGS,
  CLI_USAGE_KILL_GRACE_MS,
  CLI_USAGE_TIMEOUT_MS,
  CLI_USAGE_TTL_MS,
  cliEnv,
  fetchCliUsage,
  NO_LIMITS,
  parseUsageResponse,
  readCliUsage,
  stopCliUsage
} from './cliUsage';

class FakeChild extends EventEmitter {
  kill = vi.fn();
  stdin = new PassThrough();
  stdout = new PassThrough();
  written = '';
  constructor() {
    super();
    this.stdin.on('data', (d) => (this.written += d.toString()));
  }
  reply(response: unknown, id = 'devkitty-usage') {
    this.stdout.write(`${JSON.stringify({ response: { request_id: id, ...(response as object) }, type: 'control_response' })  }\n`);
  }
}

const children: FakeChild[] = [];
const spawnMock = vi.mocked(spawn);
const flush = () => vi.advanceTimersByTimeAsync(0);

const body = {
  rate_limits: {
    five_hour: { resets_at: '2026-10-13T11:10:00.379010+00:00', utilization: 17 },
    seven_day: { resets_at: '2026-10-20T11:10:00+00:00', utilization: 3 }
  }
};
const success = { response: body, subtype: 'success' };

describe('parseUsageResponse', () => {
  it('parses the SDK shape', () => {
    expect(parseUsageResponse(body, 5)).toEqual({
      capturedAt: 5,
      fiveHour: { pct: 0.17, resetsAt: 1791889800379 },
      sevenDay: { pct: 0.03, resetsAt: Date.parse('2026-10-20T11:10:00Z') }
    });
  });

  it('falls back to limits[] when the named windows are null', () => {
    const result = parseUsageResponse(
      {
        rate_limits: {
          five_hour: null,
          limits: [
            { kind: 'weekly_scoped', percent: 99, resets_at: '2026-10-20T11:10:00Z' },
            { kind: 'session', percent: 40, resets_at: '2026-10-13T11:10:00Z' },
            { kind: 'weekly_all', percent: 10, resets_at: '2026-10-20T11:10:00Z' }
          ],
          seven_day: null
        }
      },
      1
    );
    expect(result?.fiveHour?.pct).toBe(0.4);
    expect(result?.sevenDay?.pct).toBe(0.1);
  });

  it.each([
    ['null rate_limits', { rate_limits: null }],
    ['non-object body', 'nope'],
    ['null body', null],
    ['empty limits', { rate_limits: { limits: [] } }]
  ])('returns null for %s', (_name, input) => {
    expect(parseUsageResponse(input, 1)).toBeNull();
  });

  it('clamps utilization and drops windows without a valid reset', () => {
    const result = parseUsageResponse(
      {
        rate_limits: {
          five_hour: { resets_at: '2026-10-13T11:10:00Z', utilization: 150 },
          seven_day: { resets_at: null, utilization: 5 }
        }
      },
      1
    );
    expect(result).toEqual({ capturedAt: 1, fiveHour: { pct: 1, resetsAt: Date.parse('2026-10-13T11:10:00Z') } });
    expect(result).not.toHaveProperty('sevenDay');
  });
});

describe('cliEnv', () => {
  it('unsets CLAUDE_CONFIG_DIR for the default dir', () => {
    const env = cliEnv('/h/.claude', '/h', { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', CLAUDE_CONFIG_DIR: '/x' });
    expect(env).not.toHaveProperty('CLAUDE_CONFIG_DIR');
    expect(env.DISABLE_AUTOUPDATER).toBe('1');
    expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBeUndefined();
  });

  it('sets CLAUDE_CONFIG_DIR for other dirs without mutating the base', () => {
    const base = {};
    const env = cliEnv('/h/.claude-b', '/h', base);
    expect(env.CLAUDE_CONFIG_DIR).toBe('/h/.claude-b');
    expect(env.DISABLE_AUTOUPDATER).toBe('1');
    expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBeUndefined();
    expect(base).toEqual({});
  });
});

describe('fetchCliUsage', () => {
  const logs = ['log', 'info', 'warn', 'error'].map((m) => vi.spyOn(console, m as 'log').mockImplementation(() => {}));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    children.length = 0;
    clearCliUsageCache();
    spawnMock.mockReset();
    spawnMock.mockImplementation((() => {
      const c = new FakeChild();
      children.push(c);
      return c;
    }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns claude without a shell and writes the two frozen request lines', async () => {
    const p = fetchCliUsage('/h/.claude-b');
    const [cmd, args, opts] = spawnMock.mock.calls[0] as unknown as [string, string[], { cwd: string; env: NodeJS.ProcessEnv; shell?: unknown; stdio: unknown[] }];
    expect(cmd).toBe('claude');
    expect(args).toEqual(CLI_USAGE_ARGS);
    expect(args).toContain('');
    expect(opts.stdio[2]).toBe('ignore');
    expect(opts.shell).toBeUndefined();
    expect(opts.cwd).toBe(os.tmpdir());
    expect(opts.env.CLAUDE_CONFIG_DIR).toBe('/h/.claude-b');
    await flush();
    expect(children[0].written).toBe(
      '{"request":{"subtype":"initialize"},"request_id":"devkitty-init","type":"control_request"}\n' +
        '{"request":{"skip_behaviors":true,"subtype":"get_usage"},"request_id":"devkitty-usage","type":"control_request"}\n'
    );
    children[0].reply({ subtype: 'error' });
    await p;
  });

  it('leaves CLAUDE_CONFIG_DIR unset for the default dir', async () => {
    const p = fetchCliUsage(path.join(os.homedir(), '.claude'));
    const opts = spawnMock.mock.calls[0][2] as unknown as { env: NodeJS.ProcessEnv };
    expect(opts.env).not.toHaveProperty('CLAUDE_CONFIG_DIR');
    children[0].reply({ subtype: 'error' });
    await p;
  });

  it('resolves parsed usage on success, ignoring garbage and other ids, then kills', async () => {
    const p = fetchCliUsage('/d');
    children[0].stdout.write('not json\n');
    children[0].reply({ response: {}, subtype: 'success' }, 'devkitty-init');
    children[0].reply(success);
    const result = await p;
    expect(result && result.fiveHour?.pct).toBe(0.17);
    expect(children[0].kill).toHaveBeenCalledTimes(1);
  });

  it('resolves NO_LIMITS when the account has no limits to report (logged out)', async () => {
    const p = fetchCliUsage('/d');
    children[0].reply({ response: { rate_limits: null, rate_limits_available: false }, subtype: 'success' });
    expect(await p).toBe(NO_LIMITS);
  });

  it('resolves null for an error subtype', async () => {
    const p = fetchCliUsage('/d');
    children[0].reply({ subtype: 'error' });
    expect(await p).toBeNull();
    expect(children[0].kill).toHaveBeenCalledTimes(1);
  });

  it('resolves null on child error (ENOENT)', async () => {
    const p = fetchCliUsage('/d');
    children[0].emit('error', new Error('ENOENT'));
    expect(await p).toBeNull();
  });

  it('resolves null when the child closes before replying', async () => {
    const p = fetchCliUsage('/d');
    children[0].emit('close', 1);
    expect(await p).toBeNull();
  });

  it('resolves null on stdin error', async () => {
    const p = fetchCliUsage('/d');
    children[0].stdin.emit('error', new Error('EPIPE'));
    expect(await p).toBeNull();
  });

  it('SIGTERMs on timeout, then SIGKILLs only after the grace period', async () => {
    const p = fetchCliUsage('/d');
    await vi.advanceTimersByTimeAsync(CLI_USAGE_TIMEOUT_MS);
    expect(await p).toBeNull();
    expect(children[0].kill).toHaveBeenCalledTimes(1);
    expect(children[0].kill).toHaveBeenCalledWith('SIGTERM');
    await vi.advanceTimersByTimeAsync(CLI_USAGE_KILL_GRACE_MS);
    expect(children[0].kill).toHaveBeenCalledTimes(2);
    expect(children[0].kill).toHaveBeenLastCalledWith('SIGKILL');
  });

  it('does not SIGKILL when the child closes within the grace period', async () => {
    const p = fetchCliUsage('/d');
    await vi.advanceTimersByTimeAsync(CLI_USAGE_TIMEOUT_MS);
    await p;
    children[0].emit('close', 0);
    await vi.advanceTimersByTimeAsync(CLI_USAGE_KILL_GRACE_MS);
    expect(children[0].kill).toHaveBeenCalledTimes(1);
  });

  it('stopCliUsage ends stdin and SIGTERMs the live child', async () => {
    const p = fetchCliUsage('/d');
    stopCliUsage();
    expect(children[0].kill).toHaveBeenCalledWith('SIGTERM');
    children[0].emit('close', 0);
    await p;
  });

  it('resolves null when spawn throws', async () => {
    spawnMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    expect(await fetchCliUsage('/d')).toBeNull();
  });

  describe('readCliUsage cache', () => {
    const NOW = 1_000_000;

    it('serves a fresh entry without spawning again', async () => {
      const p = readCliUsage('/d', NOW);
      await flush();
      children[0].reply(success);
      const first = await p;
      expect(await readCliUsage('/d', NOW + 1000)).toEqual(first);
      expect(spawnMock).toHaveBeenCalledTimes(1);
    });

    it('returns the stale value immediately and refreshes once in the background', async () => {
      const p = readCliUsage('/d', NOW);
      await flush();
      children[0].reply(success);
      const first = await p;
      vi.advanceTimersByTime(CLI_USAGE_TTL_MS + 1);
      const stale = await readCliUsage('/d', NOW + CLI_USAGE_TTL_MS + 1);
      expect(stale).toEqual(first);
      await flush();
      expect(spawnMock).toHaveBeenCalledTimes(2);
      await readCliUsage('/d', NOW + CLI_USAGE_TTL_MS + 2);
      expect(spawnMock).toHaveBeenCalledTimes(2);
      children[1].reply({ subtype: 'error' });
      await flush();
    });

    it('single-flights concurrent calls for the same dir', async () => {
      const a = readCliUsage('/d', NOW);
      const b = readCliUsage('/d', NOW);
      await flush();
      expect(spawnMock).toHaveBeenCalledTimes(1);
      children[0].reply(success);
      expect(await a).toEqual(await b);
    });

    it('never runs two children at once across dirs', async () => {
      const a = readCliUsage('/a', NOW);
      const b = readCliUsage('/b', NOW);
      await flush();
      expect(spawnMock).toHaveBeenCalledTimes(1);
      children[0].reply(success);
      await a;
      await flush();
      expect(spawnMock).toHaveBeenCalledTimes(2);
      children[1].reply(success);
      await b;
    });

    it('keeps the last good value when a refresh fails', async () => {
      const p = readCliUsage('/d', NOW);
      await flush();
      children[0].reply(success);
      const first = await p;
      vi.advanceTimersByTime(CLI_USAGE_TTL_MS + 1);
      const later = NOW + CLI_USAGE_TTL_MS + 1;
      expect(await readCliUsage('/d', later)).toEqual(first);
      await flush();
      children[1].reply({ subtype: 'error' });
      await flush();
      vi.advanceTimersByTime(CLI_USAGE_TTL_MS + 1);
      expect(await readCliUsage('/d', later + CLI_USAGE_TTL_MS + 1)).toEqual(first);
    });

    it('drops the last good value once the account reports no limits', async () => {
      const p = readCliUsage('/d', NOW);
      await flush();
      children[0].reply(success);
      await p;
      vi.advanceTimersByTime(CLI_USAGE_TTL_MS + 1);
      const later = NOW + CLI_USAGE_TTL_MS + 1;
      await readCliUsage('/d', later);
      await flush();
      children[1].reply({ response: { rate_limits: null, rate_limits_available: false }, subtype: 'success' });
      await flush();
      vi.advanceTimersByTime(CLI_USAGE_TTL_MS + 1);
      expect(await readCliUsage('/d', later + 1000)).toBeNull();
    });

    it('caches a null result', async () => {
      const p = readCliUsage('/d', NOW);
      await flush();
      children[0].reply({ subtype: 'error' });
      expect(await p).toBeNull();
      expect(await readCliUsage('/d', NOW + 1000)).toBeNull();
      expect(spawnMock).toHaveBeenCalledTimes(1);
    });
  });

  it('never logs', () => {
    logs.forEach((l) => expect(l).not.toHaveBeenCalled());
  });
});
