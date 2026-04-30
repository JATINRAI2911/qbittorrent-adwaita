<script lang="ts">
  import { getAppContext } from '../../app-context';
  import Dialog from '../../ui/adw/Dialog.svelte';
  import { statisticsSections } from './statistics';

  let { close }: { close: () => void } = $props();
  const app = getAppContext();
  const sections = $derived(statisticsSections(app.session.server));
</script>

<Dialog title="Statistics" width={440} {close}>
  {#each sections as section (section.title)}
    <section class="stat-group" aria-label={section.title}>
      <h4 class="heading">{section.title}</h4>
      <div class="boxed-list">
        {#each section.rows as row (row.label)}
          <div class="row"><span class="title">{row.label}</span><span class="dimmed numeric">{row.value}</span></div>
        {/each}
      </div>
    </section>
  {/each}
</Dialog>

<style>
  .stat-group { display: flex; flex-direction: column; gap: 8px; }
  .stat-group h4 { margin: 0 4px; }
  .row .title { flex: 1; }
</style>
