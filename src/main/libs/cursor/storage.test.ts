import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readCursorStorage } from './storage';

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-storage-')); });
afterEach(() => { fs.rmSync(dir, { force: true, recursive: true }); });

const database = (rows: [string, string][]) => {
  const db = new DatabaseSync(path.join(dir, 'state.vscdb'));
  db.exec('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)');
  const insert = db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)');
  for (const row of rows) insert.run(...row);
  db.close();
};

describe('Cursor storage', () => {
  it('reads only the account allow-list', () => {
    database([
      ['cursorAuth/accessToken', 'session-value'],
      ['cursorAuth/cachedEmail', 'person@example.test'],
      ['cursorAuth/cachedTeam', '{"name":"Team"}'],
      ['cursorAuth/stripeMembershipType', 'pro'],
      ['cursor/grokBotInstalled', 'true'],
      ['unrelated/private', 'must-not-return']
    ]);
    expect(readCursorStorage(dir)).toEqual({
      accessToken: 'session-value', email: 'person@example.test', grokInstalled: true, plan: 'pro', team: 'Team'
    });
  });

  it.each(['missing', 'bad'])('fails closed for a %s database', (kind) => {
    if (kind === 'bad') fs.writeFileSync(path.join(dir, 'state.vscdb'), 'not sqlite');
    expect(readCursorStorage(dir)).toBeNull();
  });

  it('rejects a large database before it opens it', () => {
    const file = path.join(dir, 'state.vscdb');
    fs.writeFileSync(file, '');
    fs.truncateSync(file, 512 * 1024 * 1024 + 1);
    expect(readCursorStorage(dir)).toBeNull();
  });

  it('returns no data when the database is locked', () => {
    database([['cursorAuth/cachedEmail', 'person@example.test']]);
    const lock = new DatabaseSync(path.join(dir, 'state.vscdb'));
    lock.exec('BEGIN EXCLUSIVE; UPDATE ItemTable SET value = value');
    expect(readCursorStorage(dir)).toBeNull();
    lock.exec('ROLLBACK');
    lock.close();
  });
});
