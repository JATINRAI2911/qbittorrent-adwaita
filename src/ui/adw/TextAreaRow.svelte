<script lang="ts">
  interface Props {
    title: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    monospace?: boolean;
  }
  let { title, value = $bindable(''), placeholder, rows = 3, monospace = false }: Props = $props();
  const id = $props.id();
</script>

<!-- A multi-line entry in a boxed list, like a GtkTextView in a libadwaita card. -->
<div class="row textarea-row">
  <label class="er-title" for={id}>{title}</label>
  <textarea {id} {rows} {placeholder} class:monospace spellcheck="false" bind:value></textarea>
</div>

<style>
  .textarea-row { flex-direction: column; align-items: stretch; gap: 4px; padding-top: 8px; padding-bottom: 8px; }
  .er-title { font-size: smaller; opacity: var(--dim-opacity); }
  textarea { resize: vertical; min-height: 3.5em; border: 0; padding: 0; background: none; font: inherit; color: inherit; outline: none; }
  textarea.monospace { font-family: var(--monospace-font-family); font-size: var(--monospace-font-size); }
  .textarea-row:focus-within { outline: 2px solid var(--focus-ring-color); outline-offset: -2px; }
</style>
