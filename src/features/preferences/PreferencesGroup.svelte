<script lang="ts">
  import { DURATION, slide } from '../../ui/adw/motion';
  import PrefRow from './PrefRow.svelte';
  import type { PreferencesModel } from './preferences-model.svelte';
  import type { PrefDef } from './schema';

  interface Props {
    title: string;
    defs: PrefDef[];
    model: PreferencesModel;
    onsubpage?: (def: PrefDef) => void;
    oncustom?: (def: PrefDef) => void;
  }
  let { title, defs, model, onsubpage, oncustom }: Props = $props();
  const shown = $derived(defs.filter((def) => model.visible(def)));
</script>

<!-- AdwPreferencesGroup. Rows sit in slots so dependent rows can slide in and out. -->
{#if shown.length}
  <section class="pref-group" aria-label={title}>
    <h4 class="heading">{title}</h4>
    <div class="boxed-list">
      {#each shown as def (def.key)}
        <div class="pref-slot" transition:slide={{ duration: DURATION.normal }}>
          <PrefRow {def} {model} {onsubpage} {oncustom} />
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .pref-group { display: flex; flex-direction: column; gap: 8px; }
  .pref-group h4 { margin: 0 4px; }
  .pref-slot { border-bottom: 1px solid var(--card-shade-color); }
  .pref-slot:last-child { border-bottom: 0; }
  .pref-slot:first-child { border-top-left-radius: 12px; border-top-right-radius: 12px; overflow: hidden; }
  .pref-slot:last-child { border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; overflow: hidden; }
  .pref-slot :global(.row-note) { margin: -6px 0 0; padding: 0 14px 10px; font-size: smaller; opacity: var(--dim-opacity); }
  .pref-slot :global(.row-note.error) { color: var(--error-color); opacity: 1; }
</style>
