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

/**
 * Optimistic update → request → keep, or roll back and explain.
 *
 * Rollback only restores fields that still hold the optimistic value: a sync tick may have delivered
 * newer server data meanwhile (e.g. the request timed out after the server applied it), and sync only
 * sends changed fields, so clobbering it would leave the screen wrong for good. `resync` then asks for
 * a full update so anything else that drifted is corrected.
 */
export async function mutate<T extends object>(spec: MutationSpec<T>, toast: ToastApi, resync?: () => void): Promise<boolean> {
  const before = spec.items.map((item) => spec.keys.map((key) => item[key]));
  spec.optimistic?.();
  const after = spec.items.map((item) => spec.keys.map((key) => item[key]));
  try {
    await spec.request();
  } catch (error) {
    spec.items.forEach((item, i) =>
      spec.keys.forEach((key, k) => {
        if (Object.is(item[key], after[i]![k])) item[key] = before[i]![k]!;
      }),
    );
    toast.show({ title: `${spec.failure}: ${errorText(error)}` });
    resync?.();
    return false;
  }
  if (spec.success) toast.show(spec.undo ? { title: spec.success, undo: spec.undo } : { title: spec.success });
  return true;
}
