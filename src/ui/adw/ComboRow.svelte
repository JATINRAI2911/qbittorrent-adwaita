<script lang="ts" generics="T extends string">
  import Icon from './Icon.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    options: { value: T; label: string }[];
    value: T;
  }
  let { title, subtitle, options, value = $bindable() }: Props = $props();
  const id = $props.id();
</script>

<div class="row activatable combo-row">
  <span class="title-box">
    <label class="title" for={id}>{title}</label>
    {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
  </span>
  <select {id} bind:value>
    {#each options as option (option.value)}<option value={option.value}>{option.label}</option>{/each}
  </select>
  <Icon name="pan-down" class="dimmed" />
</div>
