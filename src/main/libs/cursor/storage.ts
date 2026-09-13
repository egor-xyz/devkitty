import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import os from 'os';
import path from 'path';

const MAX_DATABASE_BYTES = 512 * 1024 * 1024;
const KEYS = [
  'cursor/grokBotInstalled',
  'cursorAuth/accessToken',
  'cursorAuth/cachedEmail',
  'cursorAuth/cachedTeam',
  'cursorAuth/stripeMembershipType'
] as const;

export type CursorStorage = {
  accessToken?: string;
  email?: string;
  grokInstalled: boolean;
  plan?: string;
  team?: string;
};

export const defaultCursorStorageDir = (home = os.homedir()): string => path.join(
  home,
  'Library',
  'Application Support',
  'Cursor',
  'User',
  'globalStorage'
);

const plainString = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length > 4096) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : undefined;
  } catch {
    return value;
  }
};

const teamName = (value: unknown): string | undefined => {
  const plain = plainString(value);
  if (plain) return plain;
  if (typeof value !== 'string' || value.length > 4096) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const row = parsed as Record<string, unknown>;
    return plainString(row.name) ?? plainString(row.teamName);
  } catch {
    return undefined;
  }
};

const isTrue = (value: unknown): boolean => {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed === true || parsed === 1) return true;
    } catch {
      // Fall through to plain string forms.
    }
  }
  const plain = plainString(value)?.toLowerCase();
  return plain === 'true' || plain === '1';
};

/** Read only the small allow-list needed for Cursor account usage. */
export const readCursorStorage = (dir: string): CursorStorage | null => {
  const file = path.join(dir, 'state.vscdb');
  let db: DatabaseSync | undefined;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_DATABASE_BYTES) return null;
    db = new DatabaseSync(file, { readOnly: true });
    const placeholders = KEYS.map(() => '?').join(', ');
    const rows = db.prepare(`SELECT key, value FROM ItemTable WHERE key IN (${placeholders})`).all(...KEYS) as {
      key?: unknown;
      value?: unknown;
    }[];
    const values = new Map(rows.flatMap(({ key, value }) => typeof key === 'string' ? [[key, value] as const] : []));
    return {
      accessToken: plainString(values.get('cursorAuth/accessToken')),
      email: plainString(values.get('cursorAuth/cachedEmail')),
      grokInstalled: isTrue(values.get('cursor/grokBotInstalled')),
      plan: plainString(values.get('cursorAuth/stripeMembershipType')),
      team: teamName(values.get('cursorAuth/cachedTeam'))
    };
  } catch {
    return null;
  } finally {
    try {
      db?.close();
    } catch {
      // A failed close does not expose account data.
    }
  }
};
