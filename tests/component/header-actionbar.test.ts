import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';
import ActionBar from '../../src/features/shell/ActionBar.svelte';
import MainHeader from '../../src/features/shell/MainHeader.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

function header(torrents = [makeTorrent({ state: 'downloading' }), makeTorrent({ state: 'stoppedDL' })]) {
  const app = makeAppContext(torrents);
  render(MainHeader, { props: { torrents: app.session.torrents, server: {}, offline: false }, context: withApp(app) });
  return { app, torrents };
}

describe('MainHeader', () => {
  it('offers Select and the main menu, and Log Out logs out', async () => {
    const { app } = header();
    await userEvent.click(screen.getByRole('button', { name: 'Main Menu' }));
    const logOut = app.popovers.current!.model.sections.flat().find((i) => i.label === 'Log Out')!;
    logOut.action!();
    expect(app.session.logout).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(app.selection.mode).toBe(true);
  });

  it('switches to the selection header with a count and Cancel', async () => {
    const { app, torrents } = header();
    app.selection.enter();
    flushSync();
    expect(screen.getByRole('button', { name: /Click on Items to Select Them/ })).toBeInTheDocument();
    app.selection.toggle(torrents[0]!.hash);
    flushSync();
    await userEvent.click(screen.getByRole('button', { name: /1 Selected/ }));
    app.popovers.current!.model.sections.flat().find((i) => i.label === 'Select All')!.action!();
    expect(app.selection.size).toBe(2);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(app.selection.mode).toBe(false);
  });

  it('switches between list and table from the split button', async () => {
    const { app } = header();
    await userEvent.click(screen.getByRole('button', { name: 'Table View' }));
    expect(app.prefs.view).toBe('table');
    await userEvent.click(screen.getByRole('button', { name: 'List View' }));
    expect(app.prefs.view).toBe('list');
  });

  it('offers the list sorts in the view menu, checking the current one', async () => {
    const { app } = header();
    await userEvent.click(screen.getByRole('button', { name: 'View Options' }));
    const items = app.popovers.current!.model.sections.flat();
    expect(items.map((i) => i.label)).toEqual(['Activity', 'Name', 'Date Added', 'Size', 'Progress', 'Ratio']);
    expect(items.find((i) => i.label === 'Activity')!.checked).toBe(true);
    items.find((i) => i.label === 'Ratio')!.action!();
    expect(app.prefs.listSort).toBe('ratio');
  });

  it('offers columns and sort direction in the view menu of the table', async () => {
    const { app } = header();
    app.prefs.setView('table');
    flushSync();
    await userEvent.click(screen.getByRole('button', { name: 'View Options' }));
    const model = app.popovers.current!.model;
    const columns = model.sections.flat().find((i) => i.label === 'Columns')!.submenu!();
    columns.sections.flat().find((i) => i.label === 'Size')!.action!();
    expect(app.prefs.columns).not.toContain('size');
    model.sections.flat().find((i) => i.label === 'Ascending')!.action!();
    expect(app.prefs.tableSort.descending).toBe(false);
  });

  it('toggles search', async () => {
    const { app } = header();
    const search = screen.getByRole('button', { name: 'Search' });
    expect(search).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(search);
    expect(app.list.searchOpen).toBe(true);
    expect(search).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(search);
    expect(app.list.searchOpen).toBe(false);
  });
});

describe('ActionBar', () => {
  function bar() {
    const running = makeTorrent({ state: 'downloading' });
    const stopped = makeTorrent({ state: 'stoppedDL' });
    const app = makeAppContext([running, stopped]);
    app.selection.enter();
    render(ActionBar, { context: withApp(app) });
    return { app, running, stopped };
  }

  it('is disabled with nothing selected', () => {
    bar();
    for (const name of ['Start', 'Stop', 'Category', 'Tags', 'Move…', 'More', 'Delete']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('acts on the selection', async () => {
    const { app, running, stopped } = bar();
    app.selection.selectAll([running.hash, stopped.hash]);
    flushSync();
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(app.commands.stop).toHaveBeenCalledWith([running, stopped]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(app.openers.confirmDelete).toHaveBeenCalledWith([running, stopped]);
    await userEvent.click(screen.getByRole('button', { name: 'Category' }));
    expect(app.popovers.current?.model.title).toBe('Category');
  });

  it('disables Start when everything selected is running', () => {
    const { app, running } = bar();
    app.selection.selectAll([running.hash]);
    flushSync();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
  });
});
