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
  }
  let { title, value = $bindable(''), type = 'text', name, autocomplete, autofocus = false, disabled = false }: Props = $props();
  const id = $props.id();
</script>

<div class="row entry-row" class:filled={value !== ''}>
  <label class="er-title" for={id}>{title}</label>
  <!-- svelte-ignore a11y_autofocus -->
  <input {id} {type} {name} {autocomplete} {autofocus} {disabled} spellcheck="false" bind:value />
</div>
