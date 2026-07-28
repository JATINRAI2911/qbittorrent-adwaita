import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { TorrentFile } from '../../src/api/details';
import FilesTab from '../../src/features/details/FilesTab.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';

const f = (index: number, name: string, size: number, priority = 1): TorrentFile => ({ index, name, size, priority, progress: 0.5, piece_range: [0, 0], availability: 1 });

function setup(files: TorrentFile[]) {
  const app = makeAppContext([]);
  const view = render(FilesTab, { props: { hash: 'h', files }, context: withApp(app) });
  return Object.assign(app, { rerender: view.rerender });
}

const season = () => [f(0, 'Show/E01.mkv', 1e9), f(1, 'Show/E02.mkv', 1e9, 0), f(2, 'Show/Extras/Bonus.mkv', 5e8, 6)];

describe('FilesTab', () => {
  it('lists the tree with a summary of what is selected', () => {
    setup(season());
    // Sections sit under the sheet's h2 title.
    expect(screen.getByRole('heading', { name: '3 Files', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('1.5 GB of 2.5 GB selected')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Download Show' })).toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByRole('checkbox', { name: 'Download E02.mkv' })).toHaveAttribute('aria-checked', 'false');
  });

  it('collapses a folder', async () => {
    setup(season());
    expect(screen.getByRole('button', { name: 'Collapse Extras' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Extras' }));
    expect(screen.queryByText('Bonus.mkv')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand Extras' })).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Expand Extras' }));
    expect(screen.getByText('Bonus.mkv')).toBeInTheDocument();
  });

  it('downloads a mixed folder completely, and skips a fully wanted one', async () => {
    const files = season();
    const app = setup(files);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Download Show' }));
    expect(app.detailCommands.setPriority).toHaveBeenLastCalledWith('h', files, [0, 1, 2], 'normal');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Download Extras' }));
    expect(app.detailCommands.setPriority).toHaveBeenLastCalledWith('h', files, [2], 'skip');
  });

  it('sets a priority from the dropdown', async () => {
    const files = season();
    const app = setup(files);
    await userEvent.click(screen.getByRole('button', { name: 'Priority of E01.mkv: Normal' }));
    expect(app.popovers.current!.model.sections.flat().every((i) => i.radio)).toBe(true);
    app.popovers.current!.model.sections.flat().find((i) => i.label === 'Maximum')!.action!();
    expect(app.detailCommands.setPriority).toHaveBeenCalledWith('h', files, [0], 'maximum');
  });

  it('applies a priority to the files shown when it is chosen, even after a poll replaced them', async () => {
    const app = setup(season());
    await userEvent.click(screen.getByRole('button', { name: 'Priority of E01.mkv: Normal' }));
    const polled = season().map((f) => ({ ...f, progress: 0.9 })); // deep-different from what the menu opened on
    await app.rerender({ hash: 'h', files: polled });
    app.popovers.current!.model.sections.flat().find((i) => i.label === 'High')!.action!();
    expect(app.detailCommands.setPriority).toHaveBeenCalledWith('h', polled, [0], 'high');
  });

  it('renames a file through the row menu', async () => {
    const app = setup(season());
    await userEvent.click(screen.getByRole('button', { name: 'More for E01.mkv' }));
    app.popovers.current!.model.sections.flat().find((i) => i.label === 'Rename…')!.action!();
    expect(app.dialogs.stack.at(-1)!.props).toMatchObject({ title: 'Rename File', value: 'E01.mkv' });
    (app.dialogs.stack.at(-1)!.props.onconfirm as (v: string) => void)('Pilot.mkv');
    expect(app.detailCommands.renamePath).toHaveBeenCalledWith('h', expect.objectContaining({ kind: 'file', path: 'Show/E01.mkv' }), 'Pilot.mkv');
  });

  it('offers a filter above 20 files', async () => {
    setup(Array.from({ length: 21 }, (_, i) => f(i, `Pack/file-${String(i).padStart(2, '0')}.bin`, 10)));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter files' }), 'file-07');
    const list = screen.getByRole('list', { name: 'Files' });
    expect(within(list).getAllByRole('listitem').map((r) => r.textContent?.includes('file-07'))).toEqual([false, true]);
  });

  it('shows a spinner until files load', () => {
    const app = makeAppContext([]);
    render(FilesTab, { props: { hash: 'h', files: null }, context: withApp(app) });
    expect(screen.getByRole('progressbar', { name: 'Loading files' })).toBeInTheDocument();
  });
});
