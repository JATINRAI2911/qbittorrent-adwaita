<script lang="ts">
  let { title, value = $bindable('00:00') }: { title: string; value?: string } = $props();
  const id = $props.id();
</script>

<div class="row time-row">
  <label class="title" for={id}>{title}</label>
  <input {id} type="time" required bind:value />
</div>

<style>
  .time-row { justify-content: space-between; }
  input { border: 0; border-radius: 6px; padding: 4px 8px; font: inherit; font-variant-numeric: tabular-nums; color: inherit; background: var(--button-color); }
  input:focus-visible { outline: 2px solid var(--focus-ring-color); outline-offset: 1px; }
</style>
