<script lang="ts">
  import Dialog from '../../ui/adw/Dialog.svelte';
  import { isMac, SHORTCUTS } from '../shell/shortcuts';

  let { close }: { close: () => void } = $props();
  const mod = isMac() ? '⌘' : 'Ctrl';
  const alt = isMac() ? '⌥' : 'Alt';
  const label = (key: string) => (key === 'Mod' ? mod : key === 'Alt' ? alt : key);
  const groups = (['General', 'Torrents'] as const).map((name) => ({ name, items: SHORTCUTS.filter((s) => s.group === name) }));
</script>

<!-- AdwShortcutsDialog-style: two groups, keys drawn as keycaps. -->
<Dialog title="Keyboard Shortcuts" width={720} {close}>
  <div class="shortcut-cols">
    {#each groups as group (group.name)}
      <section class="pref-group" aria-label={group.name}>
        <h4 class="heading">{group.name}</h4>
        <div class="boxed-list">
          {#each group.items as shortcut (shortcut.label)}
            <div class="row">
              <span class="title">{shortcut.label}</span>
              <span class="keys">
                {#each shortcut.keys as combo, i (i)}
                  {#if i > 0}<span class="or">or</span>{/if}
                  {#each combo as key (key)}<kbd>{label(key)}</kbd>{/each}
                {/each}
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>
</Dialog>

<style>
  .shortcut-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; align-items: start; }
  .pref-group { display: flex; flex-direction: column; gap: 8px; }
  .pref-group h4 { margin: 0 4px; }
  .row .title { flex: 1; min-width: 0; }
  .keys { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
  .or { font-size: smaller; opacity: var(--dim-opacity); }
  kbd { min-width: 1.8em; padding: 2px 7px; border-radius: 6px; text-align: center; font: inherit; font-size: smaller; font-weight: 700; background: var(--button-color); box-shadow: inset 0 -1px rgb(0 0 0 / 14%); }
</style>
