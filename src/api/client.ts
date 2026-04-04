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
  /** Multipart body (file uploads); the browser sets the content type and boundary. */
  form?: FormData;
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

/**
 * Sends a request and reads its body with `read`, all under one timeout: a body that stalls after
 * the headers arrive (e.g. across sleep/wake) must fail like a slow request, not hang forever.
 */
async function call<T>(path: string, options: RequestOptions, read: (response: Response) => Promise<T>): Promise<T> {
  const method = options.method ?? 'GET';
  const query = encode(options.params);
  const url = `${config.baseUrl}/api/v2/${path}${method === 'GET' && query ? `?${query}` : ''}`;

  const controller = new AbortController();
  let timedOut = false;
  let rejectTimeout!: (error: ApiError) => void;
  const timeout = new Promise<never>((_resolve, reject) => (rejectTimeout = reject));
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectTimeout(new ApiError('timeout', 0, 'Request timed out'));
  }, options.timeoutMs ?? 10_000);
  timeout.catch(() => {}); // handled via Promise.race below; avoid an unhandled rejection when unused
  const onCallerAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onCallerAbort);

  try {
    let response: Response;
    try {
      response = await Promise.race([
        config.fetch(url, {
          method,
          credentials: 'same-origin',
          signal: controller.signal,
          headers: method === 'POST' && !options.form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
          body: method === 'POST' ? (options.form ?? query) : undefined,
        }),
        timeout,
      ]);
    } catch (error) {
      if (timedOut) throw new ApiError('timeout', 0, 'Request timed out');
      if (options.signal?.aborted) throw new ApiError('aborted', 0, 'Request aborted');
      throw new ApiError('network', 0, error instanceof Error ? error.message : 'Network error');
    }

    if (!response.ok) {
      const text = (await Promise.race([response.text(), timeout]).catch(() => '')) || response.statusText;
      if (response.status === 403) throw new ApiError(/banned/i.test(text) ? 'banned' : 'auth', 403, text);
      if (response.status === 401) throw new ApiError('auth', 401, text);
      if (response.status >= 500) throw new ApiError('server', response.status, text);
      throw new ApiError('request', response.status, text);
    }

    try {
      return await Promise.race([read(response), timeout]);
    } catch (error) {
      if (error instanceof ApiError) {
        void response.body?.cancel().catch(() => {});
        throw error;
      }
      throw new ApiError('network', 0, error instanceof Error ? error.message : 'Could not read response');
    }
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onCallerAbort);
  }
}

/** Returns the raw response once headers arrive; its body is read outside the timeout. Prefer the helpers below. */
export function request(path: string, options: RequestOptions = {}): Promise<Response> {
  return call(path, options, async (response) => response);
}

export function getJson<T>(path: string, params?: Params, options: Omit<RequestOptions, 'params' | 'method'> = {}): Promise<T> {
  return call(path, { ...options, params }, (response) => response.json() as Promise<T>);
}

export function getText(path: string, params?: Params, options: Omit<RequestOptions, 'params' | 'method'> = {}): Promise<string> {
  return call(path, { ...options, params }, (response) => response.text());
}

export function postText(path: string, params?: Params, options: Omit<RequestOptions, 'params' | 'method'> = {}): Promise<string> {
  return call(path, { ...options, method: 'POST', params }, (response) => response.text());
}

export async function post(path: string, params?: Params, options: Omit<RequestOptions, 'params' | 'method'> = {}): Promise<void> {
  await postText(path, params, options);
}

export function getBlob(path: string, params?: Params, options: Omit<RequestOptions, 'params' | 'method'> = {}): Promise<Blob> {
  return call(path, { ...options, params }, (response) => response.blob());
}

export function postJson<T>(path: string, params?: Params, options: Omit<RequestOptions, 'params' | 'method'> = {}): Promise<T> {
  return call(path, { ...options, method: 'POST', params }, (response) => response.json() as Promise<T>);
}

export function postFormJson<T>(path: string, form: FormData, options: Omit<RequestOptions, 'params' | 'method' | 'form'> = {}): Promise<T> {
  return call(path, { ...options, method: 'POST', form }, (response) => response.json() as Promise<T>);
}
