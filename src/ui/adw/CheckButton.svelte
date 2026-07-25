<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    checked: boolean | 'mixed';
    label: string;
    round?: boolean;
    /** -1 keeps it clickable and reachable by assistive tech, but out of the Tab order (lists with their own keys). */
    tabindex?: number;
    onclick: (event: MouseEvent) => void;
  }
  let { checked, label, round = false, tabindex, onclick }: Props = $props();
</script>

<button
  type="button"
  class="check check-button"
  class:checked={checked === true}
  class:indeterminate={checked === 'mixed'}
  class:round
  role="checkbox"
  aria-checked={checked}
  aria-label={label}
  {tabindex}
  {onclick}><Icon name="check" /></button
>
