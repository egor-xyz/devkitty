import { ipcMain } from 'electron';
import { type AIAccount } from 'types/aiUsage';

import { detectCodexCli, discoverAccounts } from '../libs/codex/accounts';
import { buildUsage } from '../libs/codex/getUsage';

ipcMain.handle('codex:detect', () => detectCodexCli());
ipcMain.handle('codex:accounts', () => discoverAccounts());
ipcMain.handle('codex:usage', (_event, account: AIAccount) => {
  if (account?.provider !== 'codex' || typeof account.dir !== 'string') throw new Error('Invalid Codex account');
  const discovered = discoverAccounts().find(({ dir }) => dir === account.dir);
  if (!discovered) throw new Error('Codex account is no longer available');
  return buildUsage(discovered, Date.now());
});
