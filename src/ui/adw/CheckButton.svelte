<script lang="ts">
  import Icon from './Icon.svelte';

  let { checked, label, onclick }: { checked: boolean | 'mixed'; label: string; onclick: () => void } = $props();
</script>

<button
  type="button"
  class="check check-button"
  class:checked={checked === true}
  class:indeterminate={checked === 'mixed'}
  role="checkbox"
  aria-checked={checked}
  aria-label={label}
  {onclick}><Icon name="check" /></button
>
