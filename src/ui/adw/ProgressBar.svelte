<script lang="ts">
  interface Props {
    value: number;
    tone?: 'accent' | 'inactive' | 'warning' | 'error';
    thin?: boolean;
    label?: string;
  }
  let { value, tone = 'accent', thin = false, label }: Props = $props();

  const percent = $derived(Math.round(Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)) * 1000) / 10);
</script>

<div class="progressbar" class:thin role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
  <div class="fill tone-{tone}" style:width="{percent}%"></div>
</div>
