import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import { gridMinWidth } from '../../src/features/table/columns';
import TableView from '../../src/features/table/TableView.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

function setup(count = 3) {
  const torrents = Array.from({ length: count }, (_, i) =>
    makeTorrent({ name: `t${String(i).padStart(3, '0')}`, state: i === 0 ? 'stoppedDL' : 'downloading', size: (i + 1) * 1000, num_seeds: 2, num_complete: 5 }),
  );
  const app = makeAppContext(torrents);
  app.prefs.setView('table');
  app.prefs.setTableSort({ column: 'name', descending: false });
  render(TableView, { context: withApp(app) });
  return { app, torrents };
}

describe('TableView', () => {
  it('renders a header per visible column and one row per torrent', () => {
    const { app } = setup();
    const grid = screen.getByRole('grid', { name: 'Torrents' });
    expect(within(grid).getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual(
      app.prefs.columns.map((id) => ({ name: 'Name', status: 'Status', progress: 'Progress', size: 'Size', down: 'Down', up: 'Up', eta: 'ETA', seeds: 'Seeds', peers: 'Peers', ratio: 'Ratio', category: 'Category', tags: 'Tags', added: 'Added' })[id]),
    );
    expect(grid).toHaveAttribute('aria-rowcount', '4');
    expect(screen.getByText('t000').closest('[role="row"]')).toHaveTextContent('Stopped');
    expect(screen.getByText('t000').closest('[role="row"]')).toHaveTextContent('0 (5)');
    expect(screen.getByText('t001').closest('[role="row"]')).toHaveTextContent('2 (5)');
  });

  it('sorts by clicking a header, and reverses on a second click', async () => {
    const { app } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Size' }));
    expect(app.prefs.tableSort).toEqual({ column: 'size', descending: true });
    expect(screen.getByRole('columnheader', { name: /Size/ })).toHaveAttribute('aria-sort', 'descending');
    await userEvent.click(screen.getByRole('button', { name: /Size/ }));
    expect(app.prefs.tableSort).toEqual({ column: 'size', descending: false });
    expect(screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('gridcell')[0]!.textContent?.trim())).toEqual(['t000', 't001', 't002']);
  });

  it('chooses columns from the header context menu, never offering Name', async () => {
    const { app } = setup();
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByRole('button', { name: 'Ratio' }) });
    const items = app.popovers.current!.model.sections.flat();
    expect(items.map((i) => i.label)).not.toContain('Name');
    const ratio = items.find((i) => i.label === 'Ratio')!;
    expect(ratio.keepOpen).toBe(true); // several columns can be toggled in one go
    expect(ratio.checked).toBe(true);
    ratio.action!();
    flushSync();
    expect(app.prefs.columns).not.toContain('ratio');
    expect(ratio.checked).toBe(false); // the open menu shows the new state
    expect(screen.queryByRole('button', { name: 'Ratio' })).toBeNull();
  });

  it('selects rows like the list: click, then Ctrl-click enters selection mode', async () => {
    const { app, torrents } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('t001'));
    expect(app.selection.targets()).toEqual([torrents[1]!.hash]);
    expect(screen.getByText('t001').closest('[role="row"]')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Control>}');
    await user.click(screen.getByText('t002'));
    await user.keyboard('{/Control}');
    expect(app.selection.mode).toBe(true);
    expect(app.selection.size).toBe(2);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('opens the torrent menu on right-click', async () => {
    const { app } = setup();
    await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByText('t002') });
    expect(app.popovers.current?.model.sections.flat().some((i) => i.label === 'Delete…')).toBe(true);
  });

  it('gives the grid a fixed minimum width so long names ellipsize instead of widening it', () => {
    const { app } = setup();
    const inner = document.querySelector<HTMLElement>('.cv-inner')!;
    expect(inner.style.minWidth).toBe(`${gridMinWidth(app.prefs.columns)}px`);
  });

  it('renders only a window of rows for large libraries', () => {
    setup(500);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '501');
    expect(screen.getAllByRole('row').length - 1).toBeLessThan(60);
  });

  it('shows No Results Found when filters hide everything', () => {
    const app = makeAppContext([makeTorrent({ name: 'x' })]);
    app.list.setFilters({ search: 'nothing' });
    render(TableView, { context: withApp(app) });
    expect(screen.getByRole('heading', { name: 'No Results Found' })).toBeInTheDocument();
  });

  it('ignores a scroll event that arrives after the grid was removed', () => {
    const { app } = setup();
    const grid = screen.getByRole('grid');
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    app.list.setFilters({ search: 'nothing matches' });
    flushSync();
    expect(screen.queryByRole('grid')).toBeNull();
    grid.dispatchEvent(new Event('scroll'));
    window.removeEventListener('error', onError);
    expect(errors).toEqual([]);
  });
});
