import { untrack } from 'svelte';
import { groupOf, STATUS_GROUPS } from '../../state/groups';
import type { ListModel } from '../list/list-model.svelte';
import { sortRows, type TableSort } from './columns';

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

  // Membership (status groups, filters) and the sort key are tracked; the values being compared are
  // not, so live speeds never reorder rows under the pointer.
  readonly rows = $derived.by(() => {
    const groups = STATUS_GROUPS[this.list.status];
    const members = this.list.matching.filter((t) => groups.includes(groupOf(t)));
    const sort = { ...this.#sort() };
    return untrack(() => sortRows(members, sort));
  });

  readonly order = $derived(this.rows.map((t) => t.hash));

  reveal(hash: string): void {
    this.revealHash = hash;
  }
}
