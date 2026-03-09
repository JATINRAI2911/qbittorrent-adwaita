import { untrack } from 'svelte';
import { groupOf, STATUS_GROUPS } from '../../state/groups';
import type { ListModel } from '../list/list-model.svelte';
import { COLUMNS, sortRows, type TableSort } from './columns';

const DEFAULT_SORT: TableSort = { column: 'added', descending: true };

/** The table view's rows: the list's filtered torrents under its status filter, in table sort order. */
export class TableModel {
  /** Row the keyboard moved to; the grid scrolls it into view and clears this. */
  revealHash = $state<string | null>(null);
  readonly #sort: () => TableSort;

  constructor(
    readonly list: ListModel,
    sort: () => TableSort = () => DEFAULT_SORT,
  ) {
    this.#sort = sort;
  }

  /**
   * Changes only when the row order has to change: membership, the sort, or a value people control in
   * the sorted column. Live columns (speeds, progress, seeds…) and state flips never re-sort.
   */
  readonly #orderKey = $derived.by(() => {
    const status = this.list.status;
    const sort = this.#sort();
    const stable = COLUMNS[sort.column].stable;
    let key = `${status}|${sort.column}|${sort.descending}`;
    for (const t of this.list.matching) key += `\u0001${t.hash}\u0002${status === 'all' ? '' : groupOf(t)}\u0002${stable ? stable(t) : ''}`;
    return key;
  });

  readonly rows = $derived.by(() => {
    void this.#orderKey;
    const status = this.list.status;
    const sort = { ...this.#sort() };
    return untrack(() => {
      const groups = STATUS_GROUPS[status];
      const members = status === 'all' ? this.list.matching : this.list.matching.filter((t) => groups.includes(groupOf(t)));
      return sortRows(members, sort);
    });
  });

  readonly order = $derived(this.rows.map((t) => t.hash));

  reveal(hash: string): void {
    this.revealHash = hash;
  }
}
