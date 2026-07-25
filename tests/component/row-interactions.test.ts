import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import TorrentList from '../../src/features/list/TorrentList.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

function setup() {
  const torrents = [
    makeTorrent({ name: 'one', state: 'downloading', added_on: 3 }),
    makeTorrent({ name: 'two', state: 'downloading', added_on: 2 }),
    makeTorrent({ name: 'three', state: 'downloading', added_on: 1 }),
  ];
  const app = makeAppContext(torrents);
  render(TorrentList, { context: withApp(app) });
  const row = (name: string) => screen.getByText(name).closest('[data-hash]')!;
  return { app, torrents, row };
}

describe('row interactions', () => {
  it('selects a row on click and enters selection mode on Ctrl-click', async () => {
    const { app, row } = setup();
    const user = userEvent.setup(); // one instance, so the held Control carries into the click
    await user.click(row('one'));
    expect(row('one')).toHaveClass('selected');
    expect(app.selection.mode).toBe(false);
    await user.keyboard('{Control>}');
    await user.click(row('three'));
    await user.keyboard('{/Control}');
    expect(app.selection.mode).toBe(true);
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
  });

  it('selects a range on Shift-click', async () => {
    const { app, row } = setup();
    const user = userEvent.setup();
    await user.click(row('one'));
    await user.keyboard('{Shift>}');
    await user.click(row('three'));
    await user.keyboard('{/Shift}');
    expect(app.selection.size).toBe(3);
  });

  it('starts or stops from the row button without selecting the row', async () => {
    const { app, torrents, row } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Stop one' }));
    expect(app.commands.toggle).toHaveBeenCalledWith([torrents[0]]);
    expect(row('one')).not.toHaveClass('selected');
  });

  it('opens the torrent menu on right-click and highlights the row', async () => {
    const { app, torrents, row } = setup();
    await userEvent.pointer({ keys: '[MouseRight]', target: row('two') });
    expect(app.popovers.current?.model.sections.flat().some((i) => i.label === 'Delete…')).toBe(true);
    expect(app.selection.targets()).toEqual([torrents[1]!.hash]);
    expect(row('two')).toHaveClass('menu-target');
    app.popovers.close();
    expect(app.selection.menuTarget).toBeNull();
  });

  it('targets the whole selection when right-clicking a selected row in selection mode', async () => {
    const { app, torrents, row } = setup();
    app.selection.selectAll([torrents[0]!.hash, torrents[1]!.hash]);
    await userEvent.pointer({ keys: '[MouseRight]', target: row('two') });
    expect(app.popovers.current?.model.sections.flat().some((i) => i.label === 'Delete 2 Torrents…')).toBe(true);
  });

  it('gives each row in selection mode a real checkbox that toggles that row on its own', async () => {
    const { app, row } = setup();
    const user = userEvent.setup();
    await user.keyboard('{Control>}');
    await user.click(row('one'));
    await user.keyboard('{/Control}');
    const check = screen.getByRole('checkbox', { name: 'Select two' });
    expect(check.tagName).toBe('BUTTON');
    await user.click(check);
    expect(check).toBeChecked();
    expect(app.selection.size).toBe(2);
    await user.click(screen.getByRole('checkbox', { name: 'Select one' }));
    expect(app.selection.size).toBe(1);
  });
});
