<script lang="ts">
  let { title, subtitle }: { title: string; subtitle?: string } = $props();
</script>

<div class="window-title">
  <span class="title">{title}</span>
  {#if subtitle}<span class="subtitle numeric">{subtitle}</span>{/if}
</div>
