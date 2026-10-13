import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import readline from 'readline';

export type ReportedUsage = {
  capturedAt: number; // epoch ms
  fiveHour?: ReportedWindow;
  sevenDay?: ReportedWindow;
};

export type ReportedWindow = {
  pct: number; // 0..1
  resetsAt: number; // epoch ms
};

export const CLI_USAGE_TTL_MS = 5 * 60 * 1000;
export const CLI_USAGE_TIMEOUT_MS = 20_000;
export const CLI_USAGE_KILL_GRACE_MS = 5000;
export const CLI_USAGE_ARGS: readonly string[] = [
  '-p',
  '--input-format',
  'stream-json',
  '--output-format',
  'stream-json',
  '--verbose',
  '--no-session-persistence',
  '--strict-mcp-config',
  '--setting-sources',
  ''
];

const INIT_ID = 'devkitty-init';
const USAGE_ID = 'devkitty-usage';

/**
 * Child environment for one account. The default `~/.claude` must NOT have
 * CLAUDE_CONFIG_DIR set: Claude Code derives its Keychain item name from that
 * variable, so setting it for the default dir would look in the wrong item and
 * read as logged out. Never mutates `process.env`.
 */
export const cliEnv = (
  configDir: string,
  home: string = os.homedir(),
  base: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = { ...base };
  delete env.CLAUDE_CONFIG_DIR;
  if (path.resolve(configDir) !== path.join(home, '.claude')) env.CLAUDE_CONFIG_DIR = path.resolve(configDir);
  // CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC also blocks the rate-limit fetch.
  delete env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;
  env.DISABLE_AUTOUPDATER = '1';
  return env;
};

const toWindow = (percent: unknown, resetsAt: unknown): ReportedWindow | undefined => {
  if (typeof percent !== 'number' || typeof resetsAt !== 'string') return undefined;
  const ms = Date.parse(resetsAt);
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return { pct: Math.max(0, Math.min(1, percent / 100)), resetsAt: ms };
};

const isRecord = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object';

const fromWindow = (raw: unknown): ReportedWindow | undefined =>
  isRecord(raw) ? toWindow(raw.utilization, raw.resets_at) : undefined;

const fromRow = (limits: unknown, kind: string): ReportedWindow | undefined => {
  if (!Array.isArray(limits)) return undefined;
  const found = limits.find((l) => isRecord(l) && l.kind === kind);
  return isRecord(found) ? toWindow(found.percent, found.resets_at) : undefined;
};

/** Parses the `get_usage` response body. Returns null when no window is usable. */
export const parseUsageResponse = (body: unknown, capturedAt: number): null | ReportedUsage => {
  const rl = isRecord(body) ? body.rate_limits : undefined;
  if (!isRecord(rl)) return null;

  const fiveHour = fromWindow(rl.five_hour) ?? fromRow(rl.limits, 'session');
  const sevenDay = fromWindow(rl.seven_day) ?? fromRow(rl.limits, 'weekly_all');
  if (!fiveHour && !sevenDay) return null;

  return { capturedAt, ...(fiveHour && { fiveHour }), ...(sevenDay && { sevenDay }) };
};

const requestLines = [
  JSON.stringify({ request: { subtype: 'initialize' }, request_id: INIT_ID, type: 'control_request' }),
  JSON.stringify({
    request: { skip_behaviors: true, subtype: 'get_usage' },
    request_id: USAGE_ID,
    type: 'control_request'
  })
];

let liveChild: ReturnType<typeof spawn> | undefined;

/** Ends the live CLI child, if any (app quit). */
export const stopCliUsage = (): void => {
  try {
    liveChild?.stdin?.end();
    liveChild?.kill('SIGTERM');
  } catch {
    // already gone
  }
};

/**
 * Asks the user's own `claude` CLI for plan rate limits (`get_usage` control
 * request). The token never enters this process. Never rejects, never logs.
 */
/** The CLI answered, but the account has no plan limits to report (e.g. logged out). */
export const NO_LIMITS = false;

export const fetchCliUsage = (configDir: string): Promise<null | ReportedUsage | typeof NO_LIMITS> =>
  new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn('claude', [...CLI_USAGE_ARGS], {
        cwd: os.tmpdir(),
        env: cliEnv(configDir),
        stdio: ['pipe', 'pipe', 'ignore']
      });
    } catch {
      resolve(null);
      return;
    }

    let settled = false;
    let closed = false;
    let rl: ReturnType<typeof readline.createInterface> | undefined;

    const settle = (value: null | ReportedUsage | typeof NO_LIMITS) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        rl?.close();
        child.stdin?.end();
        child.kill();
      } catch {
        // already gone
      }
      resolve(value);
    };
    // A slow CLI may be mid OAuth refresh: ask it to stop (SIGTERM) and only SIGKILL after a grace period.
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        rl?.close();
        child.stdin?.end();
        child.kill('SIGTERM');
      } catch {
        // already gone
      }
      const grace = setTimeout(() => {
        if (!closed) child.kill('SIGKILL');
      }, CLI_USAGE_KILL_GRACE_MS);
      grace.unref?.();
      resolve(null);
    }, CLI_USAGE_TIMEOUT_MS);

    child.on('error', () => settle(null));
    child.on('close', () => {
      closed = true;
      settle(null);
    }); // fires after stdout drains, so a reply is never lost to the exit race
    child.stdin?.on('error', () => settle(null));

    if (child.stdout) {
      rl = readline.createInterface({ input: child.stdout });
      rl.on('line', (line) => {
        let msg: unknown;
        try {
          msg = JSON.parse(line);
        } catch {
          return;
        }
        if (!isRecord(msg) || msg.type !== 'control_response' || !isRecord(msg.response)) return;
        if (msg.response.request_id !== USAGE_ID) return;
        const body = msg.response.response;
        if (msg.response.subtype !== 'success') settle(null);
        else if (isRecord(body) && body.rate_limits_available === false) settle(NO_LIMITS);
        else settle(parseUsageResponse(body, Date.now()));
      });
    }

    liveChild = child;
    child.on('close', () => {
      if (liveChild === child) liveChild = undefined;
    });

    try {
      child.stdin?.write(`${requestLines.join('\n')}\n`);
    } catch {
      settle(null);
    }
  });

type CacheEntry = { at: number; value: null | ReportedUsage };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<null | ReportedUsage>>();
let queue: Promise<unknown> = Promise.resolve();

// One claude process at a time across all dirs.
const refresh = (configDir: string, key: string): Promise<null | ReportedUsage> => {
  const existing = inflight.get(key);
  if (existing) return existing;

  const run = queue.then(() => fetchCliUsage(configDir)).catch((): null => null);
  queue = run;
  const p = run.then((value) => {
    // A failed request keeps the last good value; a definite "no limits" clears it.
    cache.set(key, { at: Date.now(), value: value === NO_LIMITS ? null : value ?? cache.get(key)?.value ?? null });
    inflight.delete(key);
    return cache.get(key)?.value ?? null;
  });
  inflight.set(key, p);
  return p;
};

/**
 * Cached `fetchCliUsage` (5 min TTL per dir, nulls cached as backoff).
 * Stale entries are returned immediately while a refresh runs in the background.
 */
export const readCliUsage = (configDir: string, now: number): Promise<null | ReportedUsage> => {
  const key = path.resolve(configDir);
  const entry = cache.get(key);
  if (entry && now - entry.at < CLI_USAGE_TTL_MS) return Promise.resolve(entry.value);

  const pending = refresh(configDir, key);
  return entry ? Promise.resolve(entry.value) : pending;
};

export const clearCliUsageCache = (): void => {
  cache.clear();
  inflight.clear();
  queue = Promise.resolve();
};
