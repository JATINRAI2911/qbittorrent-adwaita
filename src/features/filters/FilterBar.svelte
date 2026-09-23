<script lang="ts">
  import { slide } from '../../ui/adw/motion';
  import { getAppContext } from '../../app-context';
  import { NONE, categoryFacet, tagFacet, trackerFacet, type FacetItem, type Filters } from '../../state/filters';
  import type { StatusFilter } from '../../state/groups';
  import Icon from '../../ui/adw/Icon.svelte';
  import type { IconName } from '../../ui/adw/icons';
  import ToggleGroup from '../../ui/adw/ToggleGroup.svelte';
  import FacetPopover from './FacetPopover.svelte';

  type Facet = 'category' | 'tag' | 'tracker';
  const FACET_KEYS: readonly Facet[] = ['category', 'tag', 'tracker'];

  const app = getAppContext();
  const list = app.list;

  const STATUS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'downloading', label: 'Downloading' },
    { value: 'seeding', label: 'Seeding' },
    { value: 'stopped', label: 'Stopped' },
  ];

  // `plural` is `allLabel` without its "All", which phones drop.
  const FACETS: Record<Facet, { title: string; allLabel: string; plural: string; noneLabel: string; icon: IconName; items: () => FacetItem[] }> = {
    category: {
      title: 'Category',
      allLabel: 'All Categories',
      plural: 'Categories',
      noneLabel: 'Uncategorized',
      icon: 'folder',
      items: () => categoryFacet(app.session.torrents.values(), app.session.categories.keys()),
    },
    tag: { title: 'Tag', allLabel: 'All Tags', plural: 'Tags', noneLabel: 'Untagged', icon: 'tag', items: () => tagFacet(app.session.torrents.values(), app.session.tags) },
    tracker: {
      title: 'Tracker',
      allLabel: 'All Trackers',
      plural: 'Trackers',
      noneLabel: 'Trackerless',
      icon: 'network',
      items: () => trackerFacet(app.session.torrents.values(), app.trackers.byHash),
    },
  };

  const label = (facet: Facet, value: string | null) => (value === null ? FACETS[facet].allLabel : value === NONE ? FACETS[facet].noneLabel : value);

  function open(facet: Facet, event: MouseEvent) {
    const spec = FACETS[facet];
    app.popovers.togglePanel(
      FacetPopover,
      { title: spec.title, allLabel: spec.allLabel, items: spec.items(), selected: list.filters[facet], onselect: (value: string | null) => list.setFilters({ [facet]: value } as Partial<Filters>) },
      event.currentTarget as HTMLElement,
      'start',
    );
  }
</script>

<div class="filterbar" transition:slide>
  <!-- Centred over the list; edge to edge over the table, so it lines up with the columns. -->
  <div class="fb-inner" class:clamped={app.prefs.view !== 'table'}>
    <ToggleGroup label="Status" options={STATUS} value={list.status} onchange={(status) => list.setStatus(status)} />
    <span class="fb-spacer"></span>
    {#each FACET_KEYS as facet (facet)}
      <button type="button" class="btn flat dropdown" class:set={list.filters[facet] !== null} aria-haspopup="menu" onclick={(event) => open(facet, event)}>
        <Icon name={FACETS[facet].icon} /><span
          >{#if list.filters[facet] === null}<span class="fb-all">All</span>{' '}{FACETS[facet].plural}{:else}{label(facet, list.filters[facet])}{/if}</span
        ><Icon name="pan-down" class="arrow-i" />
      </button>
    {/each}
  </div>
</div>

<style>
  .filterbar { padding: 0 12px 8px; }
  .fb-inner { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .fb-inner.clamped { max-width: var(--list-column-width); margin: 0 auto; }
  .fb-spacer { flex: 1; }
  .dropdown { gap: 6px; padding: 5px 9px; font-weight: 400; }
  .dropdown > span { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dropdown :global(.arrow-i) { opacity: 0.7; }
  .dropdown.set { font-weight: 700; }

  /* Phones: the status toggles span the width, and the three dropdowns share the row below. */
  @media (max-width: 600px) {
    .fb-inner > :global(.toggle-group) { flex: 1 1 100%; }
    .fb-inner > :global(.toggle-group > .toggle) { flex: auto; padding-inline: 6px; }
    .fb-spacer { display: none; }
    .dropdown { flex: auto; min-width: 0; justify-content: center; gap: 4px; padding-inline: 6px; }
    .dropdown > span { min-width: 0; }
    .fb-all { display: none; }
  }
</style>
