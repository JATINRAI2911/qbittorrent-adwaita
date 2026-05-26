import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddDialog from '../../src/features/add/AddDialog.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { metadata } from '../fixtures/fake-add-api';
import { makeTorrent } from '../fixtures/torrents';

const HEX = 'ab'.repeat(20);
const MAGNET = `magnet:?xt=urn:btih:${HEX}&dn=Ubuntu%2024.04`;

type App = ReturnType<typeof makeAppContext>;

/** `prepare` runs before render: the dialog reads metadata and preferences while mounting. */
function setup(props: { text?: string; files?: File[] } = {}, prepare: (app: App) => void = () => {}) {
  const app = makeAppContext([makeTorrent({ hash: 'ff'.repeat(20) })]);
  prepare(app);
  const close = vi.fn();
  render(AddDialog, { props: { ...props, close }, context: withApp(app) });
  return { app, close };
}

describe('AddDialog', () => {
  it('previews a pasted magnet and adds it with the chosen options', async () => {
    const { app, close } = setup({ text: MAGNET }, (a) =>
      a.adding.api.fetchMetadata.mockResolvedValue({ pending: false, metadata: metadata({ name: 'Ubuntu 24.04', hash: HEX }) }),
    );
    const list = screen.getByRole('list', { name: 'Torrents to add' });
    expect(within(list).getByText('Ubuntu 24.04')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: /Start downloading/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(app.adding.commands.add).toHaveBeenCalledWith(
      [{ sources: { urls: [MAGNET] }, options: expect.objectContaining({ stopped: true }) }],
      ['Ubuntu 24.04'],
    );
    expect(close).toHaveBeenCalled();
  });

  it('accepts links typed into the source area', async () => {
    setup();
    await userEvent.type(screen.getByRole('textbox', { name: 'Magnet links or URLs' }), `${MAGNET}{Enter}`);
    expect(screen.getByText('Ubuntu 24.04')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Magnet links or URLs' })).toHaveValue('');
  });

  it('lets you choose files for a single torrent', async () => {
    const { app } = setup({ text: MAGNET }, (a) =>
      a.adding.api.fetchMetadata.mockResolvedValue({ pending: false, metadata: metadata({ hash: HEX, files: [{ path: 'U/a.iso', length: 5 }, { path: 'U/b.txt', length: 1 }] }) }),
    );
    const check = await screen.findByRole('checkbox', { name: 'Download b.txt' });
    await userEvent.click(check);
    expect(screen.getByText('5 bytes of 6 bytes selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(app.adding.commands.add).toHaveBeenCalledWith([expect.objectContaining({ options: expect.objectContaining({ filePriorities: [1, 0] }) })], expect.anything());
  });

  it('marks torrents already in the list and disables Add when nothing is left', async () => {
    setup({ text: `magnet:?xt=urn:btih:${'ff'.repeat(20)}&dn=Existing` });
    expect(await screen.findByText('Already added')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('opens .torrent files and parses them', async () => {
    const { app } = setup();
    const input = screen.getByLabelText('Torrent files', { selector: 'input' });
    await userEvent.upload(input, [new File(['1'], 'debian.torrent')]);
    expect(app.adding.api.parseMetadata).toHaveBeenCalled();
    expect(await screen.findByText('debian')).toBeInTheDocument();
  });

  it('fills the save path from the category under automatic management', async () => {
    setup({ text: MAGNET }, (a) => a.session.categories.set('Linux', { name: 'Linux', savePath: '/data/linux' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Category' }));
    await userEvent.click(screen.getByRole('option', { name: 'Linux' }));
    await userEvent.click(screen.getByRole('switch', { name: /Automatic management/ }));
    expect(screen.getByText('/data/linux')).toBeInTheDocument();
  });

  it('never shows a private download link in full', () => {
    setup({ text: 'https://t.example/download.php?id=1&passkey=0123456789abcdef0123456789abcdef' });
    expect(document.body.innerHTML).not.toContain('0123456789abcdef');
  });

  it('starts from qBittorrent’s defaults', async () => {
    setup({ text: MAGNET }, (a) => a.adding.appApi.preferences.mockResolvedValue({ add_stopped_enabled: true, save_path: '/dl' }));
    await vi.waitFor(() => expect(screen.getByRole('switch', { name: /Start downloading/ })).toHaveAttribute('aria-checked', 'false'));
  });
});
