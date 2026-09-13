import { type AIAccount } from 'types/aiUsage';
import { expect, it, vi } from 'vitest';

import { type Bridge } from './index';

const { exposeInMainWorld, invoke } = vi.hoisted(() => ({ exposeInMainWorld: vi.fn(), invoke: vi.fn() }));
vi.mock('electron', () => ({ contextBridge: { exposeInMainWorld }, ipcRenderer: { invoke } }));

await import('./index');
const [, bridge] = exposeInMainWorld.mock.calls[0] as [string, Bridge];

it('routes Cursor as one provider', () => {
  const account: AIAccount = { dir: '/cursor/globalStorage', label: 'Cursor', provider: 'cursor', surfaces: ['ide', 'cli'] };
  bridge.cursor.detect();
  bridge.cursor.accounts();
  bridge.cursor.usage(account);
  expect(invoke.mock.calls).toEqual([['cursor:detect'], ['cursor:accounts'], ['cursor:usage', account]]);
});

it('routes admin key calls without any read-key call', () => {
  bridge.aiUsageCredentials.status();
  bridge.aiUsageCredentials.set('openai', 'sk-admin-test');
  bridge.aiUsageCredentials.clear('openai');
  expect(invoke.mock.calls.slice(-3)).toEqual([
    ['aiUsageCredentials:status'], ['aiUsageCredentials:set', 'openai', 'sk-admin-test'], ['aiUsageCredentials:clear', 'openai']
  ]);
  expect(Object.keys(bridge.aiUsageCredentials)).toEqual(['clear', 'set', 'status']);
});
