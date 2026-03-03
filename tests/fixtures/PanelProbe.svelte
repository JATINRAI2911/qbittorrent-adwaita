<script lang="ts">
  let { text, close }: { text: string; close: () => void } = $props();
</script>

<p>{text}</p>
<button type="button" onclick={close}>Done</button>
