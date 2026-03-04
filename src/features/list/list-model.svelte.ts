import { untrack } from 'svelte';
import type { Torrent } from '../../api/types';
import { isFiltering, matches, NO_FILTERS, type Filters } from '../../state/filters';
import { compareBy, expansionAfter, layoutGroups, type GroupKey, type GroupView, type ListSort, type StatusFilter } from '../../state/groups';

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
    const hosts = this.#hosts();
    const out: Torrent[] = [];
    for (const t of this.torrents.values()) if (matches(t, filters, hosts)) out.push(t);
    return out;
  });

  readonly filtering = $derived(isFiltering(this.filters) || this.status !== 'all');

  /** Changes whenever what's shown is narrowed differently - for "scroll to top" and selection pruning. */
  readonly filterKey = $derived(JSON.stringify([this.status, this.filters]));

  // Sort comparisons are untracked: live values (progress, ratio) never reorder rows on a tick;
  // membership changes (grouping fields, filters) and sort-key changes do.
  readonly layout = $derived.by(() => {
    const compare = compareBy(this.#sort());
    return layoutGroups(this.matching, {
      status: this.status,
      libraryTotal: this.torrents.size,
      collapsed: this.collapsed,
      expanded: this.expanded,
      compare: (a, b) => untrack(() => compare(a, b)),
    });
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
