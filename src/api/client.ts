export type ApiErrorKind = 'auth' | 'banned' | 'network' | 'timeout' | 'server' | 'request' | 'aborted';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Params = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST';
  params?: Params;
  timeoutMs?: number;
  signal?: AbortSignal;
}

interface ClientConfig {
  baseUrl: string;
  fetch: typeof fetch;
}

let config: ClientConfig = { baseUrl: '', fetch: (...args) => globalThis.fetch(...args) };

export function configureClient(next: Partial<ClientConfig>): void {
  config = { ...config, ...next };
}

function encode(params: Params | undefined): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) body.append(key, String(value));
  }
  return body.toString();
}

export async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const method = options.method ?? 'GET';
  const query = encode(options.params);
  const url = `${config.baseUrl}/api/v2/${path}${method === 'GET' && query ? `?${query}` : ''}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 10_000);
  const onCallerAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onCallerAbort);

  let response: Response;
  try {
    response = await config.fetch(url, {
      method,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: method === 'POST' ? query : undefined,
    });
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', 0, 'Request timed out');
    if (options.signal?.aborted) throw new ApiError('aborted', 0, 'Request aborted');
    throw new ApiError('network', 0, error instanceof Error ? error.message : 'Network error');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onCallerAbort);
  }

  if (response.ok) return response;
  const text = (await response.text().catch(() => '')) || response.statusText;
  if (response.status === 403) throw new ApiError(/banned/i.test(text) ? 'banned' : 'auth', 403, text);
  if (response.status === 401) throw new ApiError('auth', 401, text);
  if (response.status >= 500) throw new ApiError('server', response.status, text);
  throw new ApiError('request', response.status, text);
}

export async function getJson<T>(path: string, params?: Params): Promise<T> {
  return (await request(path, { params })).json() as Promise<T>;
}

export async function getText(path: string, params?: Params): Promise<string> {
  return (await request(path, { params })).text();
}

export async function post(path: string, params?: Params): Promise<void> {
  await request(path, { method: 'POST', params });
}
