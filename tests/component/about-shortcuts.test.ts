import { render, screen, within } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import AboutDialog from '../../src/features/tools/AboutDialog.svelte';
import ShortcutsDialog from '../../src/features/tools/ShortcutsDialog.svelte';
import { SHORTCUTS } from '../../src/features/shell/shortcuts';
import { makeAppContext, withApp } from '../fixtures/app-context';

describe('shortcuts', () => {
  it('match the README table, row for row', () => {
    const readme = readFileSync('README.md', 'utf8');
    const table = readme.slice(readme.indexOf('## Keyboard'), readme.indexOf('## Design'));
    const rows = table.split('\n').filter((line) => /^\| (?!Keys|---)/.test(line));
    expect(rows).toEqual(SHORTCUTS.map((s) => `| ${s.readme} | ${s.readmeAction ?? s.label} |`));
  });

  it('are listed by group with their keys', () => {
    render(ShortcutsDialog, { props: { close: vi.fn() }, context: withApp(makeAppContext()) });
    const general = screen.getByRole('region', { name: 'General' });
    expect(within(general).getByText('Add torrents').closest('.row')).toHaveTextContent(/O/);
    expect(within(screen.getByRole('region', { name: 'Torrents' })).getByText('Rename')).toBeInTheDocument();
    // Alt+1/2 first: Ctrl/Cmd+1/2 usually switch browser tabs before the page sees them.
    const views = [...within(general).getByText('List / table view').closest('.row')!.querySelectorAll('kbd')].map((k) => k.textContent);
    expect(views.slice(0, 4)).toEqual(['Alt', '1', 'Alt', '2']);
  });
});

describe('About', () => {
  it('shows qBittorrent’s version, the Web API, this Web UI and the build', async () => {
    render(AboutDialog, { props: { close: vi.fn() }, context: withApp(makeAppContext()) });
    expect(await screen.findByText('5.2.0')).toBeInTheDocument();
    expect(await screen.findByText('2.15.1')).toBeInTheDocument();
    expect(screen.getByText(/^Adwaita \d+\.\d+\.\d+$/)).toBeInTheDocument();
    expect(await screen.findByText('1.2.20.0')).toBeInTheDocument();
    expect(screen.getByText('64-bit macOS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Website/ })).toHaveAttribute('href', 'https://www.qbittorrent.org');
  });
});
