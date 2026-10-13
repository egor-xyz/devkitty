import { ipcMain } from 'electron';
import { type ClaudeAccount } from 'types/claudeUsage';

import { detectClaudeCli, discoverAccounts } from '../libs/claude/accounts';
import { readCliUsage } from '../libs/claude/cliUsage';
import { buildUsage } from '../libs/claude/getUsage';

ipcMain.handle('claude:detect', () => detectClaudeCli());

// Only accounts Claude Code reports usage for; a logged-out one is hidden.
ipcMain.handle('claude:accounts', async () => {
  const accounts = discoverAccounts();
  const now = Date.now();
  const usage = await Promise.all(accounts.map(({ dir }) => readCliUsage(dir, now)));
  return accounts.filter((_, i) => usage[i]);
});

ipcMain.handle('claude:usage', async (_event, account: ClaudeAccount) => {
  if (!account || typeof account.dir !== 'string') throw new Error('Invalid Claude account');
  const discovered = discoverAccounts().find(({ dir }) => dir === account.dir);
  if (!discovered) throw new Error('Claude account is no longer available');
  return buildUsage(discovered, Date.now());
});
