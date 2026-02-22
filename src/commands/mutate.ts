import { ApiError } from '../api/client';
import type { ToastInput } from '../ui/adw/toast.svelte';

export interface ToastApi {
  show(input: ToastInput): void;
}

/** Captures `keys` of each item; calling the result restores them. */
export function snapshot<T extends object>(items: readonly T[], keys: readonly (keyof T)[]): () => void {
  const saved = items.map((item) => [item, keys.map((key) => [key, item[key]] as const)] as const);
  return () => {
    for (const [item, values] of saved) for (const [key, value] of values) item[key] = value;
  };
}

/** Plain-language reason for a failed request. Never includes request data. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout') return 'qBittorrent is unreachable';
    if (error.kind === 'auth' || error.kind === 'banned') return 'you are no longer logged in';
    return error.message.trim() || `HTTP ${error.status}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export interface MutationSpec<T extends object> {
  items: readonly T[];
  /** Fields the optimistic patch touches; restored if the request fails. */
  keys: readonly (keyof T)[];
  optimistic?: () => void;
  request: () => Promise<unknown>;
  /** Toast shown on success. Omit for silent mutations (e.g. undo). */
  success?: string;
  /** Prefix for the failure toast, e.g. "Couldn’t stop". */
  failure: string;
  undo?: () => void;
}

/** Optimistic update → request → keep, or roll back and explain. */
export async function mutate<T extends object>(spec: MutationSpec<T>, toast: ToastApi): Promise<boolean> {
  const restore = snapshot(spec.items, spec.keys);
  spec.optimistic?.();
  try {
    await spec.request();
  } catch (error) {
    restore();
    toast.show({ title: `${spec.failure}: ${errorText(error)}` });
    return false;
  }
  if (spec.success) toast.show(spec.undo ? { title: spec.success, undo: spec.undo } : { title: spec.success });
  return true;
}
