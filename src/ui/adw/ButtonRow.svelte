<script lang="ts">
  let { title, subtitle, onclick }: { title: string; subtitle?: string; onclick?: () => void } = $props();
</script>

<button type="button" class="row button-row" {onclick}>
  <span class="heading">{title}</span>
  {#if subtitle}<span class="dimmed">{subtitle}</span>{/if}
</button>
