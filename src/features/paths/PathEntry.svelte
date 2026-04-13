<script lang="ts">
  import { pathSuggestions, splitPath } from './suggest';

  interface Props {
    title: string;
    value?: string;
    /** Lists a folder's subfolders as absolute paths; without it this is a plain entry. */
    list?: (dir: string) => Promise<string[]>;
    autofocus?: boolean;
    placeholder?: string;
  }
  let { title, value = $bindable(''), list, autofocus = false, placeholder }: Props = $props();
  const id = $props.id();

  const cache = new Map<string, string[]>();
  let entries = $state<string[]>([]);
  let open = $state(false);
  let active = $state(-1);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const suggestions = $derived(open ? pathSuggestions(value, entries) : []);

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
  }

  function onkeydown(event: KeyboardEvent) {
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

<div class="row entry-row path-entry" class:filled={value !== ''}>
  <label class="er-title" for={id}>{title}</label>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    {id}
    type="text"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={suggestions.length > 0}
    aria-controls="{id}-list"
    aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
    spellcheck="false"
    autocomplete="off"
    {autofocus}
    {placeholder}
    bind:value
    oninput={refresh}
    onfocus={refresh}
    onblur={() => setTimeout(() => (open = false), 150)}
    {onkeydown}
  />
  {#if suggestions.length}
    <ul class="path-suggestions" id="{id}-list" role="listbox" aria-label="Folders">
      {#each suggestions as path, i (path)}
        <!-- Pointer choice; keyboard choice is handled on the input (combobox pattern). -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <li id="{id}-{i}" role="option" aria-selected={i === active} class:active={i === active} onmousedown={(event) => (event.preventDefault(), choose(path))}>{path}</li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .path-entry { overflow: visible; }
  .path-suggestions {
    position: absolute; left: 6px; right: 6px; top: calc(100% + 4px); z-index: 20; margin: 0; padding: 6px; list-style: none;
    max-height: 240px; overflow: auto; border-radius: 12px; background: var(--popover-bg-color); color: var(--popover-fg-color);
    box-shadow: 0 0 0 1px rgb(0 0 0 / 5%), 0 1px 5px 1px rgb(0 0 0 / 9%), 0 2px 14px 3px rgb(0 0 0 / 5%);
  }
  li { padding: 6px 10px; border-radius: 8px; font-family: var(--monospace-font-family); font-size: var(--monospace-font-size); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: default; }
  li:hover, li.active { background: var(--selected-color); }
</style>
