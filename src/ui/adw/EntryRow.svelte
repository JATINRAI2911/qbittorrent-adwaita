<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props {
    title: string;
    value?: string;
    type?: 'text' | 'password';
    name?: string;
    autocomplete?: HTMLInputAttributes['autocomplete'];
    autofocus?: boolean;
    disabled?: boolean;
    /** Shown only while focused, so it never overlaps the floating title. */
    placeholder?: string;
    /** Hide the text like a password without being a password field (no password-manager prompts). */
    masked?: boolean;
    /** Enter or leaving the field: the moment a typed value is final. */
    oncommit?: () => void;
  }
  let { title, value = $bindable(''), type = 'text', name, autocomplete, autofocus = false, disabled = false, placeholder, oncommit, masked }: Props = $props();
  const id = $props.id();
</script>

<div class="row entry-row" class:filled={value !== ''}>
  <label class="er-title" for={id}>{title}</label>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    {id}
    {type}
    {name}
    {autocomplete}
    {autofocus}
    {disabled}
    {placeholder}
    data-masked={masked === undefined ? undefined : String(masked)}
    class:masked
    spellcheck="false"
    bind:value
    onblur={() => oncommit?.()}
    onkeydown={(event) => {
      if (event.key === 'Enter') oncommit?.();
    }}
  />
</div>
