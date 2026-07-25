<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons';

  interface Props {
    label?: string;
    icon?: IconName;
    variant?: 'default' | 'flat' | 'suggested' | 'destructive';
    pill?: boolean;
    circular?: boolean;
    type?: 'button' | 'submit';
    disabled?: boolean;
    title?: string;
    /** Accessible name when it should say more than the tooltip (e.g. which torrent "Stop" acts on). */
    ariaLabel?: string;
    /** For buttons that open a menu or popover. */
    haspopup?: 'menu' | 'dialog' | 'listbox';
    /** For buttons that show and hide a region (collapse buttons). */
    expanded?: boolean;
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let { label, icon, variant = 'default', pill = false, circular = false, type = 'button', disabled = false, title, ariaLabel, haspopup, expanded, onclick, children }: Props = $props();

  const hasText = $derived(Boolean(label) || Boolean(children));
  const shape = $derived(icon && !hasText ? 'image-button' : icon ? 'image-text-button' : 'text-button');
</script>

<button
  {type}
  {disabled}
  {title}
  aria-label={ariaLabel ?? (hasText ? undefined : title)}
  aria-haspopup={haspopup}
  aria-expanded={expanded}
  class="btn {shape}"
  class:flat={variant === 'flat'}
  class:suggested-action={variant === 'suggested'}
  class:destructive-action={variant === 'destructive'}
  class:pill
  class:circular
  {onclick}
>
  {#if icon}<Icon name={icon} />{/if}
  {#if label}<span class="label">{label}</span>{/if}
  {@render children?.()}
</button>
