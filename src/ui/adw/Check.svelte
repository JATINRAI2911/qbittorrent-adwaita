<script lang="ts">
  import Icon from './Icon.svelte';

  let { checked, label, round = false }: { checked: boolean; label: string; round?: boolean } = $props();
</script>

<span class="check" class:checked class:round role="checkbox" aria-checked={checked} aria-label={label}><Icon name="check" /></span>
