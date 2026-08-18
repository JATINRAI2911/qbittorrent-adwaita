import { untrack } from 'svelte';
import type { Torrent } from '../../api/types';
import { isFiltering, matcher, NO_FILTERS, type Filters } from '../../state/filters';
import { compareBy, expansionAfter, groupOf, layoutGroups, sortSignature, type GroupKey, type GroupView, type ListSort, type StatusFilter } from '../../state/groups';

export interface ListModelOptions {
  /** hash → tracker hosts, for the tracker filter. */
  hosts?: () => ReadonlyMap<string, ReadonlySet<string>>;
  /** The list sort (owned by UI prefs). */
  sort?: () => ListSort;
}

const NO_HOSTS: ReadonlyMap<string, ReadonlySet<string>> = new Map();

/** What the user is looking at: filters, search, status, sort and group expansion - shared by both views. */
export class ListModel {
  status = $state<StatusFilter>('all');
  filters = $state<Filters>({ ...NO_FILTERS });
  searchOpen = $state(false);
  /** Bumped to ask the search entry to take focus (and optionally select its text). */
  searchFocus = $state({ n: 0, select: false });
  collapsed = $state<Partial<Record<GroupKey, boolean>>>({});
  expanded = $state<Partial<Record<GroupKey, number>>>({});
  readonly #hosts: () => ReadonlyMap<string, ReadonlySet<string>>;
  readonly #sort: () => ListSort;

  constructor(
    readonly torrents: ReadonlyMap<string, Torrent>,
    options: ListModelOptions = {},
  ) {
    this.#hosts = options.hosts ?? (() => NO_HOSTS);
    this.#sort = options.sort ?? (() => 'activity');
  }

  /** Torrents passing search / category / tag / tracker. Each view applies the status filter on top. */
  readonly matching = $derived.by(() => {
    const filters = this.filters;
    // Tracker hosts change often; depend on them only while a tracker filter needs them.
    const test = matcher(filters, filters.tracker !== null ? this.#hosts() : NO_HOSTS);
    const out: Torrent[] = [];
    for (const t of this.torrents.values()) if (test(t)) out.push(t);
    return out;
  });

  readonly filtering = $derived(isFiltering(this.filters) || this.status !== 'all');

  /** Changes whenever what's shown is narrowed differently - for "scroll to top" and selection pruning. */
  readonly filterKey = $derived(JSON.stringify([this.status, this.filters]));

  /**
   * Changes only when the grouped order has to change: membership (hash, group) or a sort key someone
   * controls. A $derived string that comes out equal doesn't notify, so live ticks - progress, speeds,
   * downloading↔stalled flips - never re-sort the list.
   */
  readonly #orderKey = $derived.by(() => {
    const sort = this.#sort();
    let key = sort;
    for (const t of this.matching) key += `\u0001${t.hash}\u0002${groupOf(t)}\u0002${sortSignature(t, sort)}`;
    return key;
  });

  readonly layout = $derived.by(() => {
    void this.#orderKey;
    const compare = compareBy(this.#sort());
    const options = {
      status: this.status,
      libraryTotal: this.torrents.size,
      collapsed: { ...this.collapsed },
      expanded: { ...this.expanded },
      compare,
    };
    return untrack(() => layoutGroups(this.matching, options));
  });

  /** Hashes of rendered rows, top to bottom - what arrow keys and Shift-click ranges walk. */
  readonly order = $derived(this.layout.groups.flatMap((group) => group.items.map((t) => t.hash)));

  /** Every hash in the visible groups, including collapsed/truncated rows - what Select All selects. */
  readonly allHashes = $derived(this.layout.groups.flatMap((group) => group.members.map((t) => t.hash)));

  setStatus(status: StatusFilter): void {
    if (status === this.status) return;
    this.status = status;
    this.expanded = {};
  }

  setFilters(patch: Partial<Filters>): void {
    this.filters = { ...this.filters, ...patch };
    this.expanded = {};
  }

  clearFilters(): void {
    this.filters = { ...NO_FILTERS };
    this.status = 'all';
    this.expanded = {};
  }

  openSearch(select = true): void {
    this.searchOpen = true;
    this.searchFocus = { n: this.searchFocus.n + 1, select };
  }

  closeSearch(): void {
    this.searchOpen = false;
    if (this.filters.search) this.setFilters({ search: '' });
  }

  toggleCollapsed(group: GroupView): void {
    this.collapsed[group.key] = !group.collapsed;
  }

  expand(group: GroupView): void {
    this.expanded[group.key] = expansionAfter(group, this.layout.single);
  }
}
