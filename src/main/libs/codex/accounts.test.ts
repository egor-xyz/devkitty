import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { discoverAccounts } from './accounts';

let home: string;
const profile = (name: string, config = 'model = "gpt-5"') => {
  const dir = path.join(home, name);
  fs.mkdirSync(dir, { recursive: true });
  if (config) fs.writeFileSync(path.join(dir, 'config.toml'), config);
  return dir;
};

beforeEach(() => { home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-accounts-'))); });
afterEach(() => { fs.rmSync(home, { force: true, recursive: true }); });

describe('Codex profile discovery', () => {
  it('discovers multiple profiles and explicit root, default first, and deduplicates real paths', () => {
    const extra = profile('custom');
    const second = profile('.codex-work');
    const first = profile('.codex');
    fs.symlinkSync(second, path.join(home, '.codex-alias'));
    expect(discoverAccounts(home, extra).map(({ dir }) => dir)).toEqual([first, second, extra]);
    expect(discoverAccounts(home, second)).toHaveLength(2);
  });

  it('keeps keyring configs and recent sessions but excludes empty caches and unrelated folders', () => {
    profile('.codex', '# only a comment');
    const keyring = profile('.codex-keyring', 'cli_auth_credentials_store = "keyring"');
    const session = profile('.codex-session', '');
    const sessions = path.join(session, 'sessions', '2026', '09', '09');
    fs.mkdirSync(sessions, { recursive: true });
    fs.writeFileSync(path.join(sessions, 'rollout.jsonl'), '{}\n');
    profile('unrelated');
    expect(discoverAccounts(home, '').map(({ dir }) => dir)).toEqual([keyring, session]);
  });

  it('returns only public JWT display claims without token values', () => {
    const dir = profile('.codex', '');
    const claims = { email: 'person@example.test', 'https://api.openai.com/auth': { chatgpt_plan_type: 'plus' } };
    const idToken = `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
    fs.writeFileSync(path.join(dir, 'auth.json'), JSON.stringify({ tokens: { access_token: 'secret-access', id_token: idToken } }));
    expect(discoverAccounts(home, '')).toEqual([{ dir, email: 'person@example.test', label: 'codex', plan: 'plus', provider: 'codex' }]);
    expect(JSON.stringify(discoverAccounts(home, ''))).not.toContain('secret-access');
  });

  it('does not require metadata for an auth profile, and ignores malformed claims', () => {
    const dir = profile('.codex', '');
    fs.writeFileSync(path.join(dir, 'auth.json'), '{"tokens":{"id_token":"not-a-jwt"}}');
    expect(discoverAccounts(home, '')).toEqual([{ dir, label: 'codex', provider: 'codex' }]);
  });
});
