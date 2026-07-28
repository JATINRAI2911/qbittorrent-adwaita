<script lang="ts">
  import { tick } from 'svelte';
  import Icon from '../../ui/adw/Icon.svelte';
  import { DURATION, fade, rise } from '../../ui/adw/motion';
  import { placePopover } from '../../ui/adw/position';
  import { pathSuggestions, splitPath } from './suggest';

  interface Props {
    title: string;
    value?: string;
    /** Lists a folder's subfolders as absolute paths; without it this is a plain entry. */
    list?: (dir: string) => Promise<string[]>;
    autofocus?: boolean;
    placeholder?: string;
    /** Enter (without a suggestion picked) or leaving the field: the typed path is final. */
    oncommit?: () => void;
    /** Id of a note under the row that explains or reports on this field. */
    describedby?: string;
  }
  let { title, value = $bindable(''), list, autofocus = false, placeholder, oncommit, describedby }: Props = $props();
  const id = $props.id();

  const cache = new Map<string, string[]>();
  let entries = $state<string[]>([]);
  let open = $state(false);
  let active = $state(-1);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const suggestions = $derived(open ? pathSuggestions(value, entries) : []);

  let row: HTMLDivElement;
  let input: HTMLInputElement;
  let listbox = $state<HTMLUListElement>();
  let place = $state<{ left: number; top: number; width: number; maxHeight: number | null } | null>(null);

  // The list floats in window coordinates (position: fixed), so a dialog's scrolling content
  // can't clip it; it sits under the entry, or above when there's no room below.
  function position() {
    if (!listbox) return;
    const r = row.getBoundingClientRect();
    const placed = placePopover({
      anchor: { left: r.left, top: r.top, width: r.width, height: r.height },
      size: { width: r.width, height: listbox.scrollHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      align: 'start',
      gap: 4,
    });
    place = { left: placed.left, top: placed.top, width: r.width, maxHeight: placed.maxHeight };
  }

  $effect(() => {
    if (!suggestions.length || !listbox) {
      place = null;
      return;
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  });

  const folderName = (path: string) => path.replace(/\/+$/, '').split('/').pop() || path;

  function refresh() {
    if (!list) return;
    const { dir } = splitPath(value);
    if (!dir.startsWith('/')) {
      entries = [];
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!cache.has(dir)) {
        try {
          cache.set(dir, await list(dir));
        } catch {
          cache.set(dir, []);
        }
      }
      if (splitPath(value).dir === dir) {
        entries = cache.get(dir)!;
        open = true;
        active = -1;
      }
    }, 150);
  }

  function choose(path: string) {
    value = `${path.replace(/\/+$/, '')}/`;
    open = false;
    refresh();
    // Long paths: keep the caret, and the folder just chosen, in view at the end of the entry.
    void tick().then(() => {
      input.setSelectionRange(value.length, value.length);
      input.scrollLeft = input.scrollWidth;
    });
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (!suggestions.length || active < 0)) {
      open = false;
      oncommit?.();
      return;
    }
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      active = (active + step + suggestions.length) % suggestions.length;
    } else if ((event.key === 'Enter' || event.key === 'Tab') && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]!);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      open = false;
    }
  }
</script>

<div class="row entry-row path-entry" class:filled={value !== ''} bind:this={row}>
  <label class="er-title" for={id}>{title}</label>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    {id}
    bind:this={input}
    type="text"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={suggestions.length > 0}
    aria-controls="{id}-list"
    aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
    aria-describedby={describedby}
    spellcheck="false"
    autocomplete="off"
    {autofocus}
    {placeholder}
    bind:value
    oninput={refresh}
    onfocus={refresh}
    onblur={() => {
      setTimeout(() => (open = false), 150);
      oncommit?.();
    }}
    {onkeydown}
  />
  {#if suggestions.length}
    <ul
      class="path-suggestions"
      id="{id}-list"
      role="listbox"
      aria-label="Folders"
      in:rise={{ duration: DURATION.fast, y: -4 }}
      out:fade={{ duration: 100 }}
      bind:this={listbox}
      style:position="fixed"
      style:left="{place?.left ?? 0}px"
      style:top="{place?.top ?? 0}px"
      style:width="{place?.width ?? 0}px"
      style:max-height={place?.maxHeight != null ? `${Math.min(240, place.maxHeight)}px` : undefined}
      style:visibility={place ? undefined : 'hidden'}
    >
      {#each suggestions as path, i (path)}
        <!-- Pointer choice; keyboard choice is handled on the input (combobox pattern). -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li id="{id}-{i}" role="option" aria-selected={i === active} class:active={i === active} title={path} onmousedown={(event) => (event.preventDefault(), choose(path))}>
          <Icon name="folder" class="dimmed" /><span class="name" dir="auto">{folderName(path)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .path-suggestions {
    z-index: 600; margin: 0; padding: 6px; list-style: none;
    max-height: 240px; overflow: auto; border-radius: 12px; background: var(--popover-bg-color); color: var(--popover-fg-color);
    box-shadow: 0 0 0 1px rgb(0 0 0 / 5%), 0 1px 5px 1px rgb(0 0 0 / 9%), 0 2px 14px 3px rgb(0 0 0 / 5%);
  }
  li { display: flex; align-items: center; gap: 10px; min-height: 32px; padding: 0 10px; border-radius: 8px; cursor: default; }
  li .name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li:hover, li.active { background: var(--selected-color); }
</style>
