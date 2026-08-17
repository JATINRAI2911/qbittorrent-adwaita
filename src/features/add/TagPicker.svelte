<script lang="ts">
  let { tags, selected = $bindable([]) }: { tags: readonly string[]; selected?: string[] } = $props();

  let draft = $state('');
  let error = $state('');
  let added = $state<string[]>([]);
  const all = $derived([...new Set([...tags, ...added, ...selected])].sort((a, b) => a.localeCompare(b)));

  function toggle(tag: string) {
    selected = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag];
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const tag = draft.trim();
    if (!tag) return;
    if (tag.includes(',')) {
      error = 'Tag names can’t contain commas.';
      return;
    }
    error = '';
    if (!all.includes(tag)) added = [...added, tag];
    if (!selected.includes(tag)) selected = [...selected, tag];
    draft = '';
  }
</script>

<div class="row tag-picker">
  <span class="title">Tags</span>
  <div class="tag-chips">
    {#each all as tag (tag)}
      <button type="button" class="tag-chip" class:on={selected.includes(tag)} aria-pressed={selected.includes(tag)} onclick={() => toggle(tag)}>{tag}</button>
    {/each}
    <input class="tag-new" type="text" aria-label="New tag" placeholder="New tag" spellcheck="false" bind:value={draft} {onkeydown} />
  </div>
</div>
{#if error}<p class="dialog-note error">{error}</p>{/if}

<style>
  .tag-picker { flex-wrap: wrap; gap: 8px 12px; padding-top: 10px; padding-bottom: 10px; }
  .tag-picker .title { flex: none; min-width: 80px; }
  .tag-chips { flex: 1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tag-chip { border: 0; border-radius: 99px; padding: 4px 12px; font: inherit; font-size: smaller; font-weight: 700; color: inherit; background: var(--button-color); }
  .tag-chip:hover { background: var(--button-hover-color); }
  .tag-chip.on { background: var(--accent-text-bg-color); color: var(--accent-fg-color); }
  .tag-new { flex: 1; min-width: 100px; border: 0; background: none; font: inherit; color: inherit; outline: none; padding: 4px; }
</style>
