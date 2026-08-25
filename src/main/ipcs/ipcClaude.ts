import { ipcMain } from 'electron';
import { type ClaudeAccount } from 'types/claudeUsage';

import { detectClaudeCli, discoverAccounts } from '../libs/claude/accounts';
import { buildUsage } from '../libs/claude/getUsage';

ipcMain.handle('claude:detect', () => detectClaudeCli());

ipcMain.handle('claude:accounts', () => discoverAccounts());

ipcMain.handle('claude:usage', (_event, account: ClaudeAccount) => buildUsage(account, Date.now()));
