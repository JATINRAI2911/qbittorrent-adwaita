import type { Torrent } from '../../api/types';
import { expansionAfter, layoutGroups, type GroupKey, type GroupView, type StatusFilter } from '../../state/groups';

/** The list's layout state, shared by the list view, keyboard navigation and selection. */
export class ListModel {
  status = $state<StatusFilter>('all');
  collapsed = $state<Partial<Record<GroupKey, boolean>>>({});
  expanded = $state<Partial<Record<GroupKey, number>>>({});

  constructor(readonly torrents: ReadonlyMap<string, Torrent>) {}

  // Reads only grouping/sort fields of each torrent, so live speed ticks never re-run this.
  readonly layout = $derived.by(() =>
    layoutGroups(this.torrents.values(), {
      status: this.status,
      libraryTotal: this.torrents.size,
      collapsed: this.collapsed,
      expanded: this.expanded,
    }),
  );

  /** Hashes of rendered rows, top to bottom - what arrow keys and Shift-click ranges walk. */
  readonly order = $derived(this.layout.groups.flatMap((group) => group.items.map((t) => t.hash)));

  /** Every hash in the visible groups, including collapsed/truncated rows - what Select All selects. */
  readonly allHashes = $derived(this.layout.groups.flatMap((group) => group.members.map((t) => t.hash)));

  toggleCollapsed(group: GroupView): void {
    this.collapsed[group.key] = !group.collapsed;
  }

  expand(group: GroupView): void {
    this.expanded[group.key] = expansionAfter(group, this.layout.single);
  }
}
