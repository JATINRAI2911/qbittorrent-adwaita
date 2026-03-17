import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { vi, type Mock } from 'vitest';
import type { Category, Torrent } from '../../src/api/types';
import { APP_CONTEXT_KEY, type AppContext } from '../../src/app-context';
import type { DetailCommands } from '../../src/commands/detail-commands';
import type { TorrentCommands } from '../../src/commands/torrent-commands';
import type { DialogOpeners } from '../../src/features/actions/openers';
import { DetailsModel } from '../../src/features/details/details.svelte';
import { ListModel } from '../../src/features/list/list-model.svelte';
import { TableModel } from '../../src/features/table/table-model.svelte';
import { UiPrefs } from '../../src/state/prefs.svelte';
import { Selection } from '../../src/state/selection.svelte';
import { TrackerIndex } from '../../src/state/tracker-index.svelte';
import { DialogStore } from '../../src/ui/adw/dialogs.svelte';
import { PopoverStore } from '../../src/ui/adw/popovers.svelte';
import { ToastStore } from '../../src/ui/adw/toast.svelte';
import { fakeClientData } from './fake-clientdata';
import { fakeDetailsApi } from './fake-details-api';

export type Mocked<T> = { [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K] };

const lazyMocks = <T>(result: () => unknown) =>
  new Proxy({}, { get: (target: Record<string, unknown>, key: string) => (target[key] ??= vi.fn(result)) }) as unknown as Mocked<T>;

export function makeAppContext(torrents: Torrent[] = [], overrides: Partial<AppContext> = {}) {
  const map = new SvelteMap(torrents.map((t) => [t.hash, t]));
  const session = {
    torrents: map,
    categories: new SvelteMap<string, Category>(),
    tags: new SvelteSet<string>(),
    trackers: new SvelteMap<string, string[]>(),
    server: {},
    logout: vi.fn(async () => {}),
  };
  const prefs = new UiPrefs({ api: fakeClientData() });
  const trackers = new TrackerIndex(session.trackers);
  const list = new ListModel(map, { hosts: () => trackers.byHash, sort: () => prefs.listSort });
  const commands = lazyMocks<TorrentCommands>(async () => true);
  const openers = lazyMocks<DialogOpeners>(() => undefined);
  const detailsApi = fakeDetailsApi();
  const details = new DetailsModel({ api: detailsApi, isHidden: () => false, onVisible: () => () => {} });
  const detailCommands = lazyMocks<DetailCommands>(async () => true);
  const context = {
    session,
    selection: new Selection(),
    list,
    table: new TableModel(list, () => prefs.tableSort),
    prefs,
    trackers,
    details,
    detailCommands,
    detailsApi,
    commands,
    openers,
    popovers: new PopoverStore(),
    dialogs: new DialogStore(),
    toasts: new ToastStore(),
    ...overrides,
  };
  return context as AppContext & {
    session: typeof session;
    commands: typeof commands;
    openers: typeof openers;
    detailCommands: typeof detailCommands;
    detailsApi: typeof detailsApi;
  };
}

export const withApp = (context: AppContext) => new Map<unknown, unknown>([[APP_CONTEXT_KEY, context]]);
