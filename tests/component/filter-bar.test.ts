import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import FacetPopover from '../../src/features/filters/FacetPopover.svelte';
import FilterBar from '../../src/features/filters/FilterBar.svelte';
import PopoverHost from '../../src/ui/adw/PopoverHost.svelte';
import { PopoverStore } from '../../src/ui/adw/popovers.svelte';
import type { FacetItem } from '../../src/state/filters';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

const items = (n: number): FacetItem[] => Array.from({ length: n }, (_, i) => ({ value: `c${i}`, label: `Cat ${i}`, count: i }));

describe('FacetPopover', () => {
  it('lists All first, then items with checks and counts, and chooses one', async () => {
    const onselect = vi.fn();
    const close = vi.fn();
    render(FacetPopover, { title: 'Category', allLabel: 'All Categories', items: items(3), selected: 'c1', onselect, close });
    expect(screen.queryByRole('searchbox')).toBeNull();
    const options = screen.getAllByRole('menuitemradio');
    expect(options.map((o) => o.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['All Categories', 'Cat 0 0', 'Cat 1 1', 'Cat 2 2']);
    expect(screen.getByRole('menuitemradio', { name: /Cat 1/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Cat 2/ }));
    expect(close).toHaveBeenCalled();
    expect(onselect).toHaveBeenCalledWith('c2');
  });

  it('adds a search entry above 8 items and filters by it', async () => {
    const onselect = vi.fn();
    render(FacetPopover, { title: 'Category', allLabel: 'All Categories', items: items(12), selected: null, onselect, close: vi.fn() });
    const search = screen.getByRole('searchbox', { name: 'Search Category' });
    await vi.waitFor(() => expect(search).toHaveFocus());
    await userEvent.type(search, '11');
    expect(screen.getAllByRole('menuitemradio').map((o) => o.textContent?.trim().split(/\s+/).slice(0, 2).join(' '))).toEqual(['Cat 11']);
    await userEvent.type(search, 'x');
    expect(screen.getByText('No Matches')).toBeInTheDocument();
  });

  it('moves through items with the arrow keys', async () => {
    render(FacetPopover, { title: 'Tag', allLabel: 'All Tags', items: items(2), selected: null, onselect: vi.fn(), close: vi.fn() });
    await vi.waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'All Tags' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /Cat 0/ })).toHaveFocus();
  });
});

describe('FacetPopover inside the popover host', () => {
  it('still reports the choice after closing itself', async () => {
    // Panels get their props through the host; closing clears the store before onselect runs.
    const store = new PopoverStore();
    const onselect = vi.fn();
    render(PopoverHost, { store });
    store.openPanel(FacetPopover, { title: 'Tracker', allLabel: 'All Trackers', items: items(2), selected: null, onselect }, { x: 5, y: 5 });
    await userEvent.click(await screen.findByRole('menuitemradio', { name: /Cat 1/ }));
    expect(onselect).toHaveBeenCalledWith('c1');
    expect(store.isOpen).toBe(false);
  });
});

describe('FilterBar', () => {
  function setup() {
    const torrents = [
      makeTorrent({ state: 'downloading', category: 'Films', tags: 'keep' }),
      makeTorrent({ state: 'stalledUP', progress: 1, category: '' }),
    ];
    const app = makeAppContext(torrents);
    app.session.categories.set('Films', { name: 'Films', savePath: '' });
    render(FilterBar, { context: withApp(app) });
    return { app, torrents };
  }

  it('sets the status from the toggle group', async () => {
    const { app } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Seeding' }));
    expect(app.list.status).toBe('seeding');
  });

  it('opens a category dropdown with counts and filters by the choice', async () => {
    const { app } = setup();
    await userEvent.click(screen.getByRole('button', { name: /All Categories/ }));
    const panel = app.popovers.panel!;
    expect(panel.props.items).toEqual([
      { value: '', label: 'Uncategorized', count: 1 },
      { value: 'Films', label: 'Films', count: 1 },
    ]);
    (panel.props.onselect as (value: string | null) => void)('Films');
    flushSync();
    expect(app.list.filters.category).toBe('Films');
    expect(screen.getByRole('button', { name: /Films/ })).toHaveClass('set');
  });

  it('labels the empty choices Uncategorized, Untagged and Trackerless', () => {
    const { app } = setup();
    app.list.setFilters({ category: '', tag: '', tracker: '' });
    flushSync();
    expect(screen.getByRole('button', { name: /Uncategorized/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Untagged/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trackerless/ })).toBeInTheDocument();
  });
});
