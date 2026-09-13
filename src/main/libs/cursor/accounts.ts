import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { type AIAccount, type AIDetection, type CursorSurface } from 'types/aiUsage';

import { defaultCursorStorageDir, readCursorStorage } from './storage';

const cliVersion = (): Promise<string | undefined> => new Promise((resolve) => {
  execFile('cursor-agent', ['--version'], { timeout: 5000 }, (firstError, stdout) => {
    if (!firstError) return resolve(stdout.trim() || undefined);
    execFile('agent', ['--version'], { timeout: 5000 }, (error, fallbackStdout) => {
      resolve(error ? undefined : fallbackStdout.trim() || undefined);
    });
  });
});

export const detectCursor = async (
  home = os.homedir(),
  applicationsDir = '/Applications',
  readCliVersion = cliVersion
): Promise<AIDetection> => {
  const storage = readCursorStorage(defaultCursorStorageDir(home));
  const version = await readCliVersion();
  const surfaces: CursorSurface[] = [];
  if (storage || fs.existsSync(path.join(applicationsDir, 'Cursor.app'))) surfaces.push('ide');
  if (version) surfaces.push('cli');
  if (storage?.grokInstalled || fs.existsSync(path.join(applicationsDir, 'Grok Bot.app'))) surfaces.push('grok-bot');
  return { installed: surfaces.length > 0, surfaces, version };
};

export const discoverAccounts = (home = os.homedir()): AIAccount[] => {
  const dir = defaultCursorStorageDir(home);
  const data = readCursorStorage(dir);
  if (!data?.accessToken) return [];
  const surfaces: CursorSurface[] = ['ide'];
  if (data.grokInstalled) surfaces.push('grok-bot');
  return [{
    dir,
    email: data.email,
    label: 'cursor',
    org: data.team,
    plan: data.plan,
    provider: 'cursor',
    surfaces
  }];
};
