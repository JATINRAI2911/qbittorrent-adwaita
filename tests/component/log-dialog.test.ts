import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LogMessage, PeerLogEntry } from '../../src/api/log';
import LogDialog from '../../src/features/tools/LogDialog.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';

vi.mock('../../src/lib/clipboard', () => ({ copyText: vi.fn(async () => true) }));
const { copyText } = await import('../../src/lib/clipboard');

const at = (h: number) => new Date(2001, 0, 15, h, 5, 9).getTime() / 1000;
const messages: LogMessage[] = [
  { id: 0, type: 1, message: 'qBittorrent v5.2.0 started', timestamp: at(9) },
  { id: 1, type: 2, message: 'UPnP / NAT-PMP support: ON', timestamp: at(9) },
  { id: 2, type: 4, message: 'Tracker error: https://t.example/announce/0123456789abcdef0123456789abcdef timed out', timestamp: at(10) },
  { id: 3, type: 8, message: 'File error alert. Reason: No space left on device', timestamp: at(11) },
];
const peers: PeerLogEntry[] = [
  { id: 0, ip: '203.0.113.7', blocked: false, reason: 'Too many failed logins', timestamp: at(9) },
  { id: 1, ip: '198.51.100.2', blocked: true, reason: 'IP filter', timestamp: at(10) },
];

function setup(main = messages) {
  const app = makeAppContext();
  app.tools.log.main.mockImplementation(async (lastId: number) => main.filter((m) => m.id > lastId));
  app.tools.log.peers.mockImplementation(async (lastId: number) => peers.filter((p) => p.id > lastId));
  const view = render(LogDialog, { props: { close: vi.fn() }, context: withApp(app) });
  return { app, view };
}

const rows = () => within(screen.getByRole('list', { name: 'Messages' })).queryAllByRole('listitem');

describe('Execution Log', () => {
  it('shows each message with its time, masking tracker secrets', async () => {
    setup();
    await vi.waitFor(() => expect(rows()).toHaveLength(4));
    expect(rows()[2]).toHaveTextContent('10:05:09');
    expect(rows()[2]).not.toHaveTextContent('0123456789abcdef0123456789abcdef');
    expect(screen.getByText('4 of 4')).toBeInTheDocument();
  });

  it('filters by level and searches', async () => {
    setup();
    await vi.waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(screen.getByRole('radio', { name: 'Warnings' }));
    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining('Tracker error')]);
    await userEvent.click(screen.getByRole('radio', { name: 'All' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search the log' }), 'space left');
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
  });

  it('shows the full message of the chosen row, and copies it', async () => {
    setup();
    await vi.waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(within(rows()[3]!).getByRole('button'));
    expect(within(rows()[3]!).getByRole('button')).toHaveAttribute('aria-current', 'true');
    expect(within(rows()[2]!).getByRole('button')).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('region', { name: 'Selected message' })).toHaveTextContent('File error alert. Reason: No space left on device');
    await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(copyText).toHaveBeenCalledWith('File error alert. Reason: No space left on device');
  });

  it('lists banned and blocked peers on the Peers tab', async () => {
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Peers' }));
    const list = await screen.findByRole('list', { name: 'Peers' });
    await vi.waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2));
    const [banned, blocked] = within(list).getAllByRole('listitem');
    expect(banned).toHaveTextContent('203.0.113.7');
    expect(banned).toHaveTextContent('Banned');
    expect(banned).toHaveTextContent('Too many failed logins');
    expect(blocked).toHaveTextContent('Blocked');
    expect(screen.queryByRole('radio', { name: 'Warnings' })).toBeNull();
  });

  it('renders only the visible part of a long log', async () => {
    setup(Array.from({ length: 5000 }, (_, id) => ({ id, type: 2, message: `line ${id}`, timestamp: at(9) })));
    await vi.waitFor(() => expect(screen.getByText('5,000 of 5,000')).toBeInTheDocument());
    expect(rows().length).toBeLessThan(100);
  });

  it('stops polling when it closes', async () => {
    const { app, view } = setup();
    await vi.waitFor(() => expect(app.tools.log.main).toHaveBeenCalled());
    view.unmount();
    const calls = app.tools.log.main.mock.calls.length;
    await new Promise((r) => setTimeout(r, 2200));
    expect(app.tools.log.main.mock.calls.length).toBe(calls);
  });
});
