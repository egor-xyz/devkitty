import fs from 'fs';
import os from 'os';
import path from 'path';
import { type AIAccount } from 'types/aiUsage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildUsage } from './getUsage';

const now = Date.now();
let dir: string;
let account: AIAccount;
const at = (offset: number) => new Date(now + offset).toISOString();
const token = (offset: number, total: number | undefined, last: number | undefined, extra = {}) => ({
  payload: {
    info: { last_token_usage: last === undefined ? undefined : { total_tokens: last }, total_token_usage: total === undefined ? undefined : { total_tokens: total } },
    type: 'token_count',
    ...extra
  }, timestamp: at(offset), type: 'event_msg'
});
const write = (name: string, rows: unknown[]) => {
  fs.writeFileSync(path.join(dir, 'sessions', name), rows.map((row) => typeof row === 'string' ? row : JSON.stringify(row)).join('\n'));
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-usage-'));
  fs.mkdirSync(path.join(dir, 'sessions'));
  account = { dir, label: 'codex', provider: 'codex' };
});
afterEach(() => { vi.restoreAllMocks(); fs.rmSync(dir, { force: true, recursive: true }); });

describe('Codex local usage', () => {
  it('counts cumulative deltas, repeats, resets and sparse last-only events without inventing quota', async () => {
    write('one.jsonl', [
      { payload: { id: 'one' }, type: 'session_meta' },
      { payload: { model: 'gpt-5.4' }, type: 'turn_context' },
      token(-6000, 100, 100), token(-5000, 150, 50), token(-4000, 150, 50),
      'null', '{broken', token(-3000, 20, 20), token(-2000, undefined, 5), '{"partial"'
    ]);
    const usage = await buildUsage(account, now);
    expect(usage.fiveHour).toMatchObject({ cap: 0, models: [{ model: 'gpt-5.4', tokens: 175 }], pct: 0, reported: false, resetsAt: 0, tokens: 175 });
    expect(usage.reportedAt).toBeUndefined();
  });

  it('does not add cached-input or reasoning tokens twice', async () => {
    write('one.jsonl', [token(-1000, undefined, undefined, { info: {
      total_token_usage: { cached_input_tokens: 60, input_tokens: 100, output_tokens: 40, reasoning_output_tokens: 30 }
    } })]);
    expect((await buildUsage(account, now)).fiveHour.tokens).toBe(140);
  });

  it('deduplicates copied sessions and fork history, retaining new fork work', async () => {
    const rows = [{ payload: { id: 'parent' }, type: 'session_meta' }, token(-3000, 100, 100), token(-2000, 150, 50)];
    write('parent.jsonl', rows);
    write('copy.jsonl', rows);
    write('fork.jsonl', [{ payload: { forked_from_id: 'parent', id: 'child' }, type: 'session_meta' }, ...rows.slice(1), token(-1000, 175, 25)]);
    expect((await buildUsage(account, now)).fiveHour.tokens).toBe(175);
  });

  it('does not attribute inherited totals to a fork without replay', async () => {
    write('fork.jsonl', [{ payload: { id: 'child', parent_thread_id: 'parent' }, type: 'session_meta' }, token(-1000, 100000, 25)]);
    expect((await buildUsage(account, now)).fiveHour.tokens).toBe(25);
  });

  it('maps actual weekly primary to week, preserving capture time and ignoring other limit buckets', async () => {
    const resetsAt = Math.floor((now + 3600000) / 1000);
    write('one.jsonl', [
      token(-2000, 100, 100, { rate_limits: { limit_id: 'codex', primary: { resets_at: resetsAt, used_percent: 42, window_minutes: 10080 }, secondary: null } }),
      token(-1000, 100, 100, { rate_limits: { limit_id: 'other-product', primary: { resets_at: resetsAt, used_percent: 99, window_minutes: 300 } } })
    ]);
    const usage = await buildUsage(account, now);
    expect(usage.week).toMatchObject({ durationMs: 604800000, pct: 0.42, reported: true, resetsAt: resetsAt * 1000 });
    expect(usage.fiveHour.reported).toBe(false);
    expect(usage.reportedAt).toBe(now - 2000);
  });

  it('ignores expired, malformed, future and unsupported rate windows', async () => {
    write('one.jsonl', [
      token(-3000, 100, 100, { rate_limits: { primary: { resets_at: now / 1000 - 1, used_percent: 50, window_minutes: 300 } } }),
      token(-2000, 100, 100, { rate_limits: { primary: { resets_at: now / 1000 + 9999, used_percent: 50, window_minutes: 60 } } }),
      token(-1000, 100, 100, { rate_limits: { primary: { resets_at: now / 1000 + 9999, used_percent: -1, window_minutes: 10080 } } }),
      token(1000, 200, 100, { rate_limits: { primary: { resets_at: now / 1000 + 9999, used_percent: 50, window_minutes: 300 } } })
    ]);
    const usage = await buildUsage(account, now);
    expect(usage.reportedAt).toBeUndefined();
    expect(usage.fiveHour.tokens).toBe(100);
    expect(usage.fiveHour.reported).toBe(false);
    expect(usage.week.reported).toBe(false);
  });

  it('uses old events as cumulative baseline but counts only trailing windows', async () => {
    write('one.jsonl', [token(-29 * 86400000, 100000, 100000), token(-1000, 100010, 10)]);
    expect((await buildUsage(account, now)).week.tokens).toBe(10);
  });

  it('streams large files without losing earlier tokens/model and caches unchanged files', async () => {
    write('large.jsonl', [
      { payload: { id: 'large' }, type: 'session_meta' },
      { payload: { model: 'gpt-large' }, type: 'turn_context' },
      token(-60000, 100, 100),
      { payload: { text: 'x'.repeat(17 * 1024 * 1024) }, type: 'response_item' },
      token(-1000, 150, 50)
    ]);
    const stream = vi.spyOn(fs, 'createReadStream');
    const first = await buildUsage(account, now);
    expect(first.fiveHour).toMatchObject({ models: [{ model: 'gpt-large', tokens: 150 }], tokens: 150 });
    await buildUsage(account, now + 1);
    expect(stream).toHaveBeenCalledOnce();
    fs.appendFileSync(path.join(dir, 'sessions', 'large.jsonl'), `\n${JSON.stringify(token(-500, 175, 25))}`);
    expect((await buildUsage(account, now + 2)).fiveHour.tokens).toBe(175);
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it('retains independently captured unexpired windows on same plan and clears old plan windows', async () => {
    const primary = { resets_at: now / 1000 + 3600, used_percent: 10, window_minutes: 300 };
    const weekly = { resets_at: now / 1000 + 7200, used_percent: 20, window_minutes: 10080 };
    const rows = [
      token(-3000, 100, 100, { rate_limits: { plan_type: 'plus', primary, secondary: weekly } }),
      token(-2000, 100, 100, { rate_limits: { plan_type: 'plus', primary: { ...weekly, used_percent: 21 }, secondary: null } })
    ];
    write('one.jsonl', rows);
    const usage = await buildUsage(account, now);
    expect(usage.fiveHour).toMatchObject({ pct: 0.1, reported: true });
    expect(usage.week.pct).toBe(0.21);
    expect(usage.reportedAt).toBe(now - 3000);
    write('one.jsonl', [...rows, token(-1000, 100, 100, { rate_limits: { plan_type: 'free', primary: weekly, secondary: null } })]);
    expect((await buildUsage(account, now)).fiveHour.reported).toBe(false);
    expect((await buildUsage(account, now + 7200001)).reportedAt).toBeUndefined();
  });
});
