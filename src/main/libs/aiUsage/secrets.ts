import { safeStorage } from 'electron';
import Store from 'electron-store';

export type AIUsageCredentialProvider = 'anthropic' | 'openai';
type EncryptedSecretStore = {
  delete: (key: AIUsageCredentialProvider) => void;
  get: (key: AIUsageCredentialProvider) => string | undefined;
  set: (key: AIUsageCredentialProvider, value: string) => void;
};
type SecretCrypto = {
  decryptString: (value: Buffer) => string;
  encryptString: (value: string) => Buffer;
  isEncryptionAvailable: () => boolean;
};

const prefixes: Record<AIUsageCredentialProvider, string> = {
  anthropic: 'sk-ant-admin',
  openai: 'sk-admin'
};

export const createAIUsageSecrets = (store: EncryptedSecretStore, crypto: SecretCrypto) => {
  const clear = (provider: AIUsageCredentialProvider): void => {
    store.delete(provider);
  };
  const get = (provider: AIUsageCredentialProvider): string | undefined => {
    const encrypted = store.get(provider);
    if (!encrypted) return undefined;
    try {
      return crypto.decryptString(Buffer.from(encrypted, 'base64'));
    } catch {
      return undefined;
    }
  };
  const set = (provider: AIUsageCredentialProvider, value: string): void => {
    if (!value.startsWith(prefixes[provider])) throw new Error(`A ${provider} admin key is required`);
    if (!crypto.isEncryptionAvailable()) throw new Error('Secure storage is not available');
    store.set(provider, crypto.encryptString(value).toString('base64'));
  };
  const status = (): Record<AIUsageCredentialProvider, boolean> => ({
    anthropic: Boolean(get('anthropic')),
    openai: Boolean(get('openai'))
  });
  return { clear, get, set, status };
};

const encryptedStore = new Store<Record<AIUsageCredentialProvider, string>>({ name: 'devkitty.ai-usage-secrets' });
export const aiUsageSecrets = createAIUsageSecrets(encryptedStore, safeStorage);
