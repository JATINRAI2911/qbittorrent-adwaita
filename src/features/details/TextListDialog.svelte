<script lang="ts">
  import Dialog from '../../ui/adw/Dialog.svelte';

  interface Props {
    title: string;
    label: string;
    placeholder?: string;
    description?: string;
    confirmLabel: string;
    onconfirm: (text: string) => void;
    close: () => void;
  }
  let { title, label, placeholder, description, confirmLabel, onconfirm, close }: Props = $props();
  const id = $props.id();
  let text = $state('');
</script>

<Dialog
  {title}
  {confirmLabel}
  confirmDisabled={text.trim() === ''}
  {close}
  onconfirm={() => {
    onconfirm(text.trim());
    close();
  }}
>
  <div class="text-list">
    <label class="heading" for={id}>{label}</label>
    <textarea {id} rows="6" spellcheck="false" {placeholder} bind:value={text}></textarea>
    {#if description}<p class="dialog-note">{description}</p>{/if}
  </div>
</Dialog>

<style>
  .text-list { display: flex; flex-direction: column; gap: 8px; }
  .text-list label { margin: 0 4px; }
  textarea {
    min-height: 140px; resize: vertical; padding: 10px 12px; border: 0; border-radius: 12px; font: inherit;
    font-family: var(--monospace-font-family); font-size: var(--monospace-font-size);
    background: var(--card-bg-color); color: inherit; box-shadow: 0 0 0 1px rgb(0 0 6 / 3%), 0 1px 3px 1px rgb(0 0 6 / 7%);
  }
  textarea:focus { outline: 2px solid var(--focus-ring-color); outline-offset: -2px; }
  .text-list .dialog-note { margin: 0 4px; }
</style>
