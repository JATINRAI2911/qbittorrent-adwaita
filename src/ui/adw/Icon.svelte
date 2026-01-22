<script lang="ts">
  import { ICONS, type IconName } from './icons';

  let { name, class: className = '' }: { name: IconName; class?: string } = $props();
</script>

<svg class="i {className}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
  {#each ICONS[name] as path, i (i)}
    <path d={path.d} fill={path.fill ? 'currentColor' : 'none'} stroke={path.fill ? 'none' : 'currentColor'} />
  {/each}
</svg>
