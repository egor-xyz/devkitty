import { ipcMain } from 'electron';

import { type AIUsageCredentialProvider, aiUsageSecrets } from '../libs/aiUsage/secrets';

const isProvider = (value: unknown): value is AIUsageCredentialProvider => value === 'anthropic' || value === 'openai';
const provider = (value: unknown): AIUsageCredentialProvider => {
  if (!isProvider(value)) throw new Error('Invalid AI usage provider');
  return value;
};

ipcMain.handle('aiUsageCredentials:status', () => aiUsageSecrets.status());
ipcMain.handle('aiUsageCredentials:set', (_event, name: unknown, value: unknown) => {
  if (typeof value !== 'string') throw new Error('Invalid admin key');
  aiUsageSecrets.set(provider(name), value.trim());
});
ipcMain.handle('aiUsageCredentials:clear', (_event, name: unknown) => aiUsageSecrets.clear(provider(name)));
