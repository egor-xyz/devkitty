import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { type AIAccount, type AIDetection } from 'types/aiUsage';

import { sessionFiles } from './transcripts';

export const detectCodexCli = (): Promise<AIDetection> => new Promise((resolve) => {
  execFile('codex', ['--version'], { timeout: 5000 }, (error, stdout) => {
    if (error) return resolve({ installed: false });
    resolve({ installed: true, version: stdout.trim().replace(/^codex(?:-cli)?\s+/i, '') });
  });
});

const readSmallFile = (file: string): string | undefined => {
  try {
    if (fs.statSync(file).size > 1024 * 1024) return undefined;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
};

// Decode public display claims only. JWTs remain local and are never returned.
const readProfile = (auth: string | undefined): Partial<AIAccount> => {
  try {
    const data = JSON.parse(auth ?? '{}');
    const token = data.tokens?.id_token;
    if (typeof token !== 'string') return {};
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    const plan = claims['https://api.openai.com/auth']?.chatgpt_plan_type;
    return {
      email: typeof claims.email === 'string' ? claims.email : undefined,
      plan: typeof plan === 'string' ? plan : undefined
    };
  } catch {
    return {};
  }
};

/** Profiles are independent analytics directories; discovery never changes CLI login. */
export const discoverAccounts = (home = os.homedir(), codexHome = process.env.CODEX_HOME): AIAccount[] => {
  let siblings: string[] = [];
  try {
    siblings = fs.readdirSync(home).filter((name) => name.startsWith('.codex-')).sort();
  } catch {
    // An explicit CODEX_HOME can still be usable when the home directory is unreadable.
  }
  const candidates = [path.join(home, '.codex'), ...siblings.map((name) => path.join(home, name))];
  if (codexHome) candidates.push(path.resolve(codexHome));
  const seen = new Set<string>();
  const accounts: AIAccount[] = [];
  for (const candidate of candidates) {
    try {
      const dir = fs.realpathSync(candidate);
      if (seen.has(dir) || !fs.statSync(dir).isDirectory()) continue;
      seen.add(dir);
      const auth = readSmallFile(path.join(dir, 'auth.json'));
      const config = readSmallFile(path.join(dir, 'config.toml'));
      // Config supports keyring-only profiles. An empty cache directory is insufficient.
      const configured = config?.split('\n').some((line) => /^\s*[\w.-]+\s*=\s*\S/.test(line));
      if (!auth && !configured && sessionFiles(dir, Date.now()).length === 0) continue;
      accounts.push({ ...readProfile(auth), dir, label: path.basename(candidate).replace(/^\./, ''), provider: 'codex' });
    } catch {
      // Missing or unreadable candidate; another profile may still be available.
    }
  }
  return accounts;
};
