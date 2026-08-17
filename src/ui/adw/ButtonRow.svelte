<script lang="ts">
  /** `listitem`: inside a role=list, the row is a list item holding the button. */
  let { title, subtitle, listitem = false, onclick }: { title: string; subtitle?: string; listitem?: boolean; onclick?: () => void } = $props();
</script>

{#snippet content()}
  <span class="heading">{title}</span>
  {#if subtitle}<span class="dimmed">{subtitle}</span>{/if}
{/snippet}

{#if listitem}
  <div class="row button-row-item" role="listitem"><button type="button" class="button-row" {onclick}>{@render content()}</button></div>
{:else}
  <button type="button" class="row button-row" {onclick}>{@render content()}</button>
{/if}
