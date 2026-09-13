import { ipcMain } from 'electron';
import { type AIAccount } from 'types/aiUsage';

import { detectCursor, discoverAccounts } from '../libs/cursor/accounts';
import { buildUsage } from '../libs/cursor/getUsage';

ipcMain.handle('cursor:detect', () => detectCursor());
ipcMain.handle('cursor:accounts', () => discoverAccounts());
ipcMain.handle('cursor:usage', (_event, account: AIAccount) => {
  if (account?.provider !== 'cursor' || typeof account.dir !== 'string') throw new Error('Invalid Cursor account');
  const discovered = discoverAccounts().find(({ dir }) => dir === account.dir);
  if (!discovered) throw new Error('Cursor account is no longer available');
  return buildUsage(discovered, Date.now());
});
