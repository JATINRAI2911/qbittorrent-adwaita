<script lang="ts" module>
  export interface AlertResponse {
    id: string;
    label: string;
    variant?: 'default' | 'suggested' | 'destructive';
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    heading: string;
    body?: string;
    responses: AlertResponse[];
    onresponse: (id: string) => void;
    close: () => void;
    children?: Snippet;
  }
  let { heading, body, responses, onresponse, close, children }: Props = $props();

  const id = $props.id();
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let area: HTMLDivElement;

  $effect(() => {
    area.querySelector<HTMLButtonElement>('button')?.focus();
    return () => previous?.focus();
  });

  function respond(response: AlertResponse) {
    close();
    onresponse(response.id);
  }
</script>

<div class="dialog alert-dialog" role="alertdialog" aria-modal="true" aria-labelledby="{id}-heading" aria-describedby={body ? `${id}-body` : undefined}>
  <div class="message-area">
    <h2 class="title-2" id="{id}-heading">{heading}</h2>
    {#if body}<p class="body" id="{id}-body">{body}</p>{/if}
    {#if children}<div class="alert-extra">{@render children()}</div>{/if}
  </div>
  <div class="response-area" bind:this={area}>
    {#each responses as response (response.id)}
      <button
        type="button"
        class="btn text-button"
        class:suggested-action={response.variant === 'suggested'}
        class:destructive-action={response.variant === 'destructive'}
        onclick={() => respond(response)}>{response.label}</button
      >
    {/each}
  </div>
</div>
