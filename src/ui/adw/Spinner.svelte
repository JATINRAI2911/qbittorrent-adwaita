<script lang="ts">
  let { size = 16, label }: { size?: number; label?: string } = $props();
</script>

<span
  class="spinner"
  style:width="{size}px"
  style:height="{size}px"
  style:border-width="{Math.max(2, Math.round(size / 10))}px"
  role={label ? 'progressbar' : undefined}
  aria-label={label}
></span>
