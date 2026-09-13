import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as CursorStorageModule from './storage';

vi.mock('./storage', async (load) => {
  const actual = await load<typeof CursorStorageModule>();
  return { ...actual, readCursorStorage: vi.fn() };
});

import { detectCursor, discoverAccounts } from './accounts';
import { readCursorStorage } from './storage';

let home: string;
let apps: string;
beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-home-'));
  apps = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-apps-'));
  vi.clearAllMocks();
});
afterEach(() => {
  fs.rmSync(home, { force: true, recursive: true });
  fs.rmSync(apps, { force: true, recursive: true });
});

describe('Cursor accounts', () => {
  it.each([
    ['IDE', true, undefined, false, ['ide']],
    ['CLI', false, '1.0', false, ['cli']],
    ['Grok', false, undefined, true, ['grok-bot']],
    ['all', true, '1.0', true, ['ide', 'cli', 'grok-bot']]
  ])('detects %s surfaces', async (_name, ide, version, grok, surfaces) => {
    vi.mocked(readCursorStorage).mockReturnValue(null);
    if (ide) fs.mkdirSync(path.join(apps, 'Cursor.app'));
    if (grok) fs.mkdirSync(path.join(apps, 'Grok Bot.app'));
    expect(await detectCursor(home, apps, async () => version)).toEqual({ installed: true, surfaces, version });
  });

  it('returns one safe account for shared IDE and CLI use', () => {
    vi.mocked(readCursorStorage).mockReturnValue({
      accessToken: ['part', 'part', 'part'].join('.'), email: 'person@example.test', grokInstalled: true, plan: 'pro', team: 'Team'
    });
    const accounts = discoverAccounts(home);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ email: 'person@example.test', provider: 'cursor', surfaces: ['ide', 'grok-bot'] });
    expect(accounts[0]).not.toHaveProperty('accessToken');
  });

  it('does not return an account without a local login', () => {
    vi.mocked(readCursorStorage).mockReturnValue({ grokInstalled: true });
    expect(discoverAccounts(home)).toEqual([]);
  });
});
