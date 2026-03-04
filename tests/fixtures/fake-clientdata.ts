import { vi } from 'vitest';
import type { ClientDataApi } from '../../src/api/clientdata';

export function fakeClientData(stored: Record<string, unknown> = {}) {
  return {
    load: vi.fn<ClientDataApi['load']>(async (keys) => Object.fromEntries(keys.filter((k) => k in stored).map((k) => [k, stored[k]]))),
    store: vi.fn<ClientDataApi['store']>(async () => undefined),
  };
}
