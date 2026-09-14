import { ipcMain } from 'electron';
import { type ClaudeAccount } from 'types/claudeUsage';

import { detectClaudeCli, discoverAccounts } from '../libs/claude/accounts';
import { buildUsage } from '../libs/claude/getUsage';

ipcMain.handle('claude:detect', () => detectClaudeCli());

ipcMain.handle('claude:accounts', () => discoverAccounts());

ipcMain.handle('claude:usage', async (_event, account: ClaudeAccount) => {
  if (!account || typeof account.dir !== 'string') throw new Error('Invalid Claude account');
  const discovered = discoverAccounts().find(({ dir }) => dir === account.dir);
  if (!discovered) throw new Error('Claude account is no longer available');
  return buildUsage(discovered, Date.now());
});
