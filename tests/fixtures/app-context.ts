import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { vi, type Mock } from 'vitest';
import type { Category, Torrent } from '../../src/api/types';
import { APP_CONTEXT_KEY, type AppContext } from '../../src/app-context';
import type { TorrentCommands } from '../../src/commands/torrent-commands';
import type { DialogOpeners } from '../../src/features/actions/openers';
import { ListModel } from '../../src/features/list/list-model.svelte';
import { Selection } from '../../src/state/selection.svelte';
import { DialogStore } from '../../src/ui/adw/dialogs.svelte';
import { PopoverStore } from '../../src/ui/adw/popovers.svelte';
import { ToastStore } from '../../src/ui/adw/toast.svelte';

export type Mocked<T> = { [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K] };

const lazyMocks = <T>(result: () => unknown) =>
  new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn(result)) }) as unknown as Mocked<T>;

export function makeAppContext(torrents: Torrent[] = [], overrides: Partial<AppContext> = {}) {
  const map = new SvelteMap(torrents.map((t) => [t.hash, t]));
  const session = {
    torrents: map,
    categories: new SvelteMap<string, Category>(),
    tags: new SvelteSet<string>(),
    server: {},
    logout: vi.fn(async () => {}),
  };
  const commands = lazyMocks<TorrentCommands>(async () => true);
  const openers = lazyMocks<DialogOpeners>(() => undefined);
  const context = {
    session,
    selection: new Selection(),
    list: new ListModel(map),
    commands,
    openers,
    popovers: new PopoverStore(),
    dialogs: new DialogStore(),
    toasts: new ToastStore(),
    ...overrides,
  };
  return context as AppContext & { session: typeof session; commands: typeof commands; openers: typeof openers };
}

export const withApp = (context: AppContext) => new Map<unknown, unknown>([[APP_CONTEXT_KEY, context]]);
