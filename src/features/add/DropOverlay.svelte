<script lang="ts">
  import Icon from '../../ui/adw/Icon.svelte';
</script>

<div class="drop-overlay" aria-hidden="true">
  <div class="drop-card"><Icon name="list-add" /><span class="title-2">Drop to Add Torrents</span></div>
</div>

<style>
  .drop-overlay {
    position: fixed; inset: 0; z-index: 700; display: grid; place-items: center; pointer-events: none;
    background: color-mix(in srgb, var(--accent-bg-color) 12%, transparent); outline: 3px dashed var(--accent-bg-color); outline-offset: -12px;
  }
  .drop-card { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px 36px; border-radius: 18px; background: var(--window-bg-color); box-shadow: 0 2px 14px 3px rgb(0 0 6 / 10%); color: var(--accent-color); }
  .drop-card :global(svg.i) { width: 48px; height: 48px; }
</style>
