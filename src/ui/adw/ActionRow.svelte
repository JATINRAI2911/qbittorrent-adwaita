<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    /** Trailing value text, dimmed (e.g. “3 addresses”). */
    value?: string;
    onclick?: () => void;
    disabled?: boolean;
  }
  let { title, subtitle, value, onclick, disabled = false }: Props = $props();
</script>

<!-- AdwActionRow, activatable, with the go-next chevron: opens a sub-page or dialog. -->
<button type="button" class="row activatable action-row" {disabled} {onclick}>
  <span class="title-box">
    <span class="title">{title}</span>
    {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
  </span>
  {#if value}<span class="action-value">{value}</span>{/if}
  <Icon name="pan-end" class="dimmed" />
</button>

<style>
  .action-row { width: 100%; border: 0; background: none; font: inherit; color: inherit; text-align: left; gap: 12px; }
  .action-row .title-box { flex: 1; min-width: 0; }
  .action-value { opacity: var(--dim-opacity); white-space: nowrap; }
</style>
