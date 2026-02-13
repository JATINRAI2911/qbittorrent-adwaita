<script lang="ts">
  interface Props {
    title: string;
    subtitle?: string;
    subtitleTone?: 'error';
    checked?: boolean;
    disabled?: boolean;
    onchange?: (checked: boolean) => void;
  }
  let { title, subtitle, subtitleTone, checked = $bindable(false), disabled = false, onchange }: Props = $props();

  function toggle() {
    checked = !checked;
    onchange?.(checked);
  }
</script>

<button type="button" class="row activatable switch-row" role="switch" aria-checked={checked} {disabled} onclick={toggle}>
  <span class="title-box">
    <span class="title">{title}</span>
    {#if subtitle}<span class="subtitle" class:error={subtitleTone === 'error'}>{subtitle}</span>{/if}
  </span>
  <span class="switch" class:checked aria-hidden="true"><span class="slider"></span></span>
</button>
