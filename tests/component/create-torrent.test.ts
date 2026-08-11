import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../src/api/client';
import CreateTorrentDialog from '../../src/features/tools/CreateTorrentDialog.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';

vi.mock('../../src/lib/download', () => ({ downloadBlob: vi.fn(), safeFilename: (s: string) => s }));
const { downloadBlob } = await import('../../src/lib/download');

function setup(libtorrent = '1.2.20.0', tasks: Awaited<ReturnType<ReturnType<typeof makeAppContext>['tools']['creator']['status']>> = []) {
  const app = makeAppContext();
  app.tools.creator.status.mockResolvedValue(tasks);
  app.adding.appApi.buildInfo.mockResolvedValue({ qt: '6', libtorrent, boost: '1', openssl: '3', zlib: '1', bitness: 64, platform: 'macos' });
  render(CreateTorrentDialog, { props: { close: vi.fn() }, context: withApp(app) });
  return { app };
}

async function fillSource(path = '/data/share') {
  await userEvent.type(screen.getByRole('combobox', { name: 'File or folder' }), path);
}

describe('Create Torrent', () => {
  it('can’t create without a source, and sends libtorrent 1 options to a libtorrent 1 server', async () => {
    const { app } = setup('1.2.20.0');
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeDisabled();
    expect(await screen.findByRole('switch', { name: /Optimize alignment/ })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Format' })).toBeNull();
    await fillSource();
    await userEvent.type(screen.getByRole('textbox', { name: 'Trackers' }), 'udp://a{Enter}{Enter}udp://b c');
    await userEvent.click(create);
    expect(app.tools.creator.addTask).toHaveBeenCalledWith({
      sourcePath: '/data/share', pieceSize: 0, private: false, startSeeding: true, optimizeAlignment: true, paddedFileSizeLimit: -1, trackers: 'udp%3A%2F%2Fa||udp%3A%2F%2Fb%20c',
    });
  });

  it('offers the v1 / v2 / hybrid format on libtorrent 2', async () => {
    const { app } = setup('2.0.11.0');
    const format = await screen.findByRole('combobox', { name: 'Format' });
    expect(format).toHaveTextContent('Hybrid');
    expect(screen.queryByRole('switch', { name: /Optimize alignment/ })).toBeNull();
    await fillSource();
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(app.tools.creator.addTask).toHaveBeenCalledWith(expect.objectContaining({ format: 'hybrid' }));
  });

  it('explains when qBittorrent refuses a new task', async () => {
    const { app } = setup();
    const show = vi.spyOn(app.toasts, 'show');
    app.tools.creator.addTask.mockRejectedValueOnce(new ApiError('request', 409, 'Too many active tasks'));
    await fillSource();
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith({ title: 'Couldn’t create the torrent: Too many active tasks' }));
  });

  it('shows task progress, downloads finished torrents and removes tasks', async () => {
    const { app } = setup('1.2.20.0', [
      { taskID: 't1', sourcePath: '/data/share', pieceSize: 0, private: false, timeAdded: '', status: 'Running', progress: 42 },
      { taskID: 't2', sourcePath: '/data/movie.mkv', pieceSize: 0, private: false, timeAdded: '', status: 'Finished' },
      { taskID: 't3', sourcePath: '/data/broken', pieceSize: 0, private: false, timeAdded: '', status: 'Failed', errorMessage: 'Permission denied' },
    ]);
    const tasks = await screen.findByRole('list', { name: 'Tasks' });
    const [running, finished, failed] = within(tasks).getAllByRole('listitem');
    expect(running).toHaveTextContent('42%');
    expect(within(running!).queryByRole('button', { name: /Download/ })).toBeNull();
    await userEvent.click(within(finished!).getByRole('button', { name: 'Download movie.mkv.torrent' }));
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'movie.mkv.torrent'));
    expect(failed).toHaveTextContent('Permission denied');
    await userEvent.click(within(failed!).getByRole('button', { name: 'Remove broken' }));
    expect(app.tools.creator.deleteTask).toHaveBeenCalledWith('t3');
  });

  it('polls nothing after it closes, even when two refreshes overlapped (no orphaned timer)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const running = { taskID: 't1', sourcePath: '/data/share', pieceSize: 0, private: false, timeAdded: '', status: 'Running' as const, progress: 1 };
      const failed = { taskID: 't3', sourcePath: '/data/broken', pieceSize: 0, private: false, timeAdded: '', status: 'Failed' as const, errorMessage: 'x' };
      const app = makeAppContext();
      app.tools.creator.status.mockResolvedValue([running, failed]);
      app.adding.appApi.buildInfo.mockResolvedValue({ qt: '6', libtorrent: '1.2.20.0', boost: '1', openssl: '3', zlib: '1', bitness: 64, platform: 'macos' });
      const { unmount } = render(CreateTorrentDialog, { props: { close: vi.fn() }, context: withApp(app) });
      await vi.advanceTimersByTimeAsync(0);
      const pending: (() => void)[] = [];
      app.tools.creator.status.mockImplementation(() => new Promise((resolve) => pending.push(() => resolve([running, failed]))));
      await vi.advanceTimersByTimeAsync(1000); // the poll starts, and waits on the server
      await fireEvent.click(screen.getByRole('button', { name: 'Remove broken' })); // a second refresh overlaps it
      await vi.advanceTimersByTimeAsync(0);
      expect(pending).toHaveLength(2);
      pending.shift()!();
      await vi.advanceTimersByTimeAsync(300);
      pending.shift()!();
      await vi.advanceTimersByTimeAsync(0);
      unmount();
      const before = app.tools.creator.status.mock.calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(app.tools.creator.status.mock.calls.length).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});
