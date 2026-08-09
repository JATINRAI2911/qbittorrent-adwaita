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
  it('opens Preferences from the top of the main menu', async () => {
    const { app } = header();
    await userEvent.click(screen.getByRole('button', { name: 'Main Menu' }));
    const first = app.popovers.current!.model.sections[0]![0]!;
    expect([first.label, first.accel]).toEqual(['Preferences…', 'Ctrl+,']);
    first.action!();
    expect(app.openers.preferences).toHaveBeenCalled();
  });

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
    expect(items.every((i) => i.radio)).toBe(true);
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
    expect(model.sections.flat().filter((i) => i.radio).map((i) => i.label)).toEqual(['Ascending', 'Descending']);
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
  function bar(offline = false) {
    const running = makeTorrent({ state: 'downloading' });
    const stopped = makeTorrent({ state: 'stoppedDL' });
    const app = makeAppContext([running, stopped]);
    app.selection.enter();
    render(ActionBar, { props: { offline }, context: withApp(app) });
    return { app, running, stopped };
  }

  it('is disabled while qBittorrent is unreachable, even with a selection', () => {
    const { app, running, stopped } = bar(true);
    app.selection.selectAll([running.hash, stopped.hash]);
    flushSync();
    for (const name of ['Start', 'Stop', 'Category', 'Tags', 'Move…', 'More', 'Delete']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

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

describe('header health controls', () => {
  it('shows the alternative-limits state on the turtle and toggles it', async () => {
    const app = makeAppContext();
    render(MainHeader, { props: { torrents: app.session.torrents, server: { use_alt_speed_limits: true }, offline: false }, context: withApp(app) });
    const turtle = screen.getByRole('button', { name: 'Alternative Speed Limits' });
    expect(turtle).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(turtle);
    expect(app.global.commands.setAltSpeed).toHaveBeenCalledWith(false);
  });

  it('names the health on the status button and opens the status popover', async () => {
    const app = makeAppContext();
    const health = { level: 'warning' as const, line: 'Low disk space', banner: null };
    render(MainHeader, { props: { torrents: app.session.torrents, server: {}, offline: false, health }, context: withApp(app) });
    const status = screen.getByRole('button', { name: 'Status: Low disk space' });
    // The menu button pattern: aria-expanded only while open.
    expect(status).not.toHaveAttribute('aria-expanded');
    await userEvent.click(status);
    expect(app.popovers.panel).not.toBeNull();
    expect(status).toHaveAttribute('aria-expanded', 'true');
    app.popovers.close();
    expect(status).not.toHaveAttribute('aria-expanded');
  });

  it('disables the turtle while offline', () => {
    const app = makeAppContext();
    render(MainHeader, { props: { torrents: app.session.torrents, server: {}, offline: true }, context: withApp(app) });
    expect(screen.getByRole('button', { name: 'Alternative Speed Limits' })).toBeDisabled();
  });

  it('groups the main menu like GNOME apps and opens each tool', async () => {
    const { app } = header();
    await userEvent.click(screen.getByRole('button', { name: 'Main Menu' }));
    const sections = app.popovers.current!.model.sections.map((section) => section.map((item) => item.label));
    expect(sections).toEqual([
      ['Preferences…', 'Speed Limits…'],
      ['Manage Categories…', 'Manage Tags…'],
      ['Statistics', 'Execution Log', 'Create Torrent…', 'Cookies'],
      ['Keyboard Shortcuts', 'About qBittorrent'],
      ['Log Out', 'Quit qBittorrent…'],
    ]);
    const item = (label: string) => app.popovers.current!.model.sections.flat().find((i) => i.label === label)!;
    const openers: [string, keyof typeof app.openers][] = [
      ['Speed Limits…', 'speedLimits'], ['Statistics', 'statistics'], ['Execution Log', 'log'], ['Create Torrent…', 'createTorrent'],
      ['Cookies', 'cookies'], ['Keyboard Shortcuts', 'shortcuts'], ['About qBittorrent', 'about'], ['Quit qBittorrent…', 'quit'],
    ];
    for (const [label, opener] of openers) {
      item(label).action!();
      expect(app.openers[opener], label).toHaveBeenCalled();
    }
    expect(item('Quit qBittorrent…').destructive).toBe(true);
  });
});
