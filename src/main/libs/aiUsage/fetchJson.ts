const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

export type FetchJsonOptions = {
  fetcher?: Fetcher;
  headers?: Record<string, string>;
  maxBytes?: number;
  method?: 'GET';
  timeoutMs?: number;
};

type Fetcher = typeof fetch;

const readLimitedBody = async (response: Response, maxBytes: number): Promise<string> => {
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) throw new Error('Response is too large');

  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('Response is too large');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
};

export const fetchJson = async (url: string, options: FetchJsonOptions = {}): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await (options.fetcher ?? fetch)(url, {
      headers: options.headers,
      method: options.method ?? 'GET',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const body = await readLimitedBody(response, options.maxBytes ?? DEFAULT_MAX_BYTES);
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error('Response is not valid JSON');
    }
  } catch (error) {
    if (error instanceof Error && ['Response is not valid JSON', 'Response is too large'].includes(error.message)) throw error;
    if (controller.signal.aborted) throw new Error('Request timed out');
    if (error instanceof Error && /^Request failed \(\d+\)$/.test(error.message)) throw error;
    throw new Error('Request failed');
  } finally {
    clearTimeout(timeout);
  }
};
