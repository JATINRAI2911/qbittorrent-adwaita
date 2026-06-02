import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PreferencesDialog from '../../src/features/preferences/PreferencesDialog.svelte';
import type { PageId } from '../../src/features/preferences/schema';
import { makeAppContext, withApp } from '../fixtures/app-context';
import fixture from '../fixtures/preferences-5.2.json';

function setup(props: { page?: PageId } = {}, load: () => Promise<Record<string, unknown>> = async () => structuredClone(fixture)) {
  const app = makeAppContext();
  app.adding.appApi.preferences.mockImplementation(load);
  const close = vi.fn();
  render(PreferencesDialog, { props: { ...props, close }, context: withApp(app) });
  return { app, close };
}

describe('PreferencesDialog', () => {
  it('lists the pages in a sidebar, hides RSS, and opens on Behavior', async () => {
    setup();
    const pages = screen.getByRole('navigation', { name: 'Pages' });
    expect(within(pages).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Behavior', 'Downloads', 'Connection', 'Speed', 'BitTorrent', 'Web UI', 'Advanced']);
    expect(await screen.findByRole('region', { name: 'Transfer List' })).toBeInTheDocument();
    expect(within(pages).getByRole('button', { name: 'Behavior' })).toHaveAttribute('aria-current', 'page');
  });

  it('switches pages and can open on a given page', async () => {
    setup({ page: 'connection' });
    expect(await screen.findByRole('region', { name: 'Listening Port' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Speed' }));
    expect(screen.getByRole('region', { name: 'Global Limits' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Download' })).toHaveValue('40000');
  });

  it('searches every page, groups results by page, and says when nothing matches', async () => {
    setup();
    await screen.findByRole('region', { name: 'Transfer List' });
    await userEvent.click(screen.getByRole('button', { name: 'Search Preferences' }));
    const search = screen.getByRole('searchbox', { name: 'Search preferences' });
    await userEvent.type(search, 'port forward');
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Connection › Listening Port', 'Web UI › Server', 'Advanced › qBittorrent']);
    await userEvent.clear(search);
    await userEvent.type(search, 'incomplete torrents folder');
    expect(screen.getByText('Needs “Keep incomplete torrents elsewhere”')).toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, 'zzzz');
    expect(screen.getByText('No Results')).toBeInTheDocument();
  });

  it('shows an error with Try Again when the preferences can’t be read', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(structuredClone(fixture));
    setup({}, load);
    await userEvent.click(await screen.findByRole('button', { name: 'Try Again' }));
    expect(await screen.findByRole('region', { name: 'Transfer List' })).toBeInTheDocument();
  });

  it('sends pending edits and refreshes the cached preferences when it closes', async () => {
    const { app, close } = setup({ page: 'speed' });
    const refresh = vi.spyOn(app.global.prefs, 'refresh');
    const input = await screen.findByRole('textbox', { name: 'Download' });
    await userEvent.clear(input);
    await userEvent.type(input, '100{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await vi.waitFor(() => expect(app.adding.appApi.setPreferences).toHaveBeenCalledWith({ dl_limit: 102_400 }));
    expect(close).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });
});
