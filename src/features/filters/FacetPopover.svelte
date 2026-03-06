<script lang="ts">
  import { tick } from 'svelte';
  import { formatCount } from '../../lib/format';
  import type { FacetItem } from '../../state/filters';
  import Icon from '../../ui/adw/Icon.svelte';
  import SearchEntry from '../../ui/adw/SearchEntry.svelte';

  interface Props {
    title: string;
    allLabel: string;
    items: FacetItem[];
    selected: string | null;
    onselect: (value: string | null) => void;
    close: () => void;
  }
  let { title, allLabel, items, selected, onselect, close }: Props = $props();

  let query = $state('');
  let input = $state<HTMLInputElement>();
  let list: HTMLDivElement;
  const searchable = $derived(items.length > 8);
  const needle = $derived(query.trim().toLocaleLowerCase());
  const shown = $derived(needle ? items.filter((item) => item.label.toLocaleLowerCase().includes(needle)) : items);
  const buttons = () => [...list.querySelectorAll<HTMLButtonElement>('button')];

  $effect(() => {
    void tick().then(() => (searchable ? input : buttons()[0])?.focus());
  });

  function choose(value: string | null) {
    close();
    onselect(value);
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const all = buttons();
    if (!all.length) return;
    event.preventDefault();
    const index = all.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) all[event.key === 'ArrowDown' ? 0 : all.length - 1]!.focus();
    else all[Math.max(0, Math.min(all.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]!.focus();
  }
</script>

<div class="facet" role="menu" tabindex="-1" aria-label={title} {onkeydown}>
  {#if searchable}
    <div class="facet-search"><SearchEntry label="Search {title}" placeholder="Search" bind:value={query} bind:input /></div>
  {/if}
  <div class="facet-list" bind:this={list}>
    {#if !needle}
      <button type="button" class="menu-item" role="menuitemradio" aria-checked={selected === null} onclick={() => choose(null)}>
        <span class="menu-check">{#if selected === null}<Icon name="check" />{/if}</span><span class="menu-label">{allLabel}</span>
      </button>
      <div class="menu-sep" role="separator"></div>
    {/if}
    {#each shown as item (item.value)}
      <button type="button" class="menu-item" role="menuitemradio" aria-checked={selected === item.value} onclick={() => choose(item.value)}>
        <span class="menu-check">{#if selected === item.value}<Icon name="check" />{/if}</span>
        <span class="menu-label">{item.label}</span>
        <span class="facet-count numeric">{formatCount(item.count)}</span>
      </button>
    {/each}
    {#if shown.length === 0}<p class="menu-empty">No Matches</p>{/if}
  </div>
</div>
