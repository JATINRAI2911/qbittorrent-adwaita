import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ApiKeyDialog from '../../src/features/preferences/ApiKeyDialog.svelte';
import NetworkInterfaceDialog from '../../src/features/preferences/NetworkInterfaceDialog.svelte';
import PreferencesDialog from '../../src/features/preferences/PreferencesDialog.svelte';
import { PreferencesModel } from '../../src/features/preferences/preferences-model.svelte';
import { maskApiKey } from '../../src/features/preferences/values';
import WatchedFoldersDialog from '../../src/features/preferences/WatchedFoldersDialog.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import fixture from '../fixtures/preferences-5.2.json';

async function modelFor(app: ReturnType<typeof makeAppContext>, overrides: Record<string, unknown> = {}) {
  let prefs = { ...structuredClone(fixture), ...overrides } as Record<string, unknown>;
  app.adding.appApi.preferences.mockImplementation(async () => prefs);
  app.adding.appApi.setPreferences.mockImplementation(async (changes) => {
    prefs = { ...prefs, ...changes };
  });
  const model = new PreferencesModel({ api: app.adding.appApi, toast: app.toasts, confirm: vi.fn(async () => true) });
  await model.load();
  return { model, setPrefs: (next: Record<string, unknown>) => (prefs = { ...prefs, ...next }) };
}

describe('API key', () => {
  it('masks all but the ends of the key, like qBittorrent', () => {
    expect(maskApiKey('qbt_0123456789abcdefghij')).toBe('qbt_••••••••••••••efghij');
    expect(maskApiKey('')).toBe('');
  });

  it('rotates and deletes the key after confirming, showing the new key once', async () => {
    const app = makeAppContext();
    const { model, setPrefs } = await modelFor(app, { web_ui_api_key: 'qbt_0123456789abcdefghij' });
    render(ApiKeyDialog, { props: { model, close: vi.fn() }, context: withApp(app) });
    expect(screen.getByText('qbt_••••••••••••••efghij')).toBeInTheDocument();
    app.adding.appApi.rotateAPIKey.mockImplementation(async () => {
      setPrefs({ web_ui_api_key: 'qbt_newkeynewkeynewkey99' });
      return 'qbt_newkeynewkeynewkey99';
    });
    await userEvent.click(screen.getByRole('button', { name: 'Rotate' }));
    (app.dialogs.stack.at(-1)!.props.onresponse as (id: string) => void)('confirm');
    expect(await screen.findByText('qbt_newkeynewkeynewkey99')).toBeInTheDocument();
    expect(screen.getByText(/Copy it now/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    (app.dialogs.stack.at(-1)!.props.onresponse as (id: string) => void)('confirm');
    await vi.waitFor(() => expect(app.adding.appApi.deleteAPIKey).toHaveBeenCalled());
  });
});

describe('API key copy', () => {
  it('copies the stored key too, not only a freshly created one', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const app = makeAppContext();
    const { model } = await modelFor(app, { web_ui_api_key: 'qbt_0123456789abcdefghij' });
    render(ApiKeyDialog, { props: { model, close: vi.fn() }, context: withApp(app) });
    await userEvent.click(screen.getByRole('button', { name: 'Copy the API key' }));
    expect(writeText).toHaveBeenCalledWith('qbt_0123456789abcdefghij');
  });
});

describe('Watched folders', () => {
  it('edits scan_dirs as folders with where their torrents are saved', async () => {
    const app = makeAppContext();
    const { model } = await modelFor(app, { scan_dirs: { '/watch/a': 0, '/watch/b': 1, '/watch/c': '/dl/c' } });
    render(WatchedFoldersDialog, { props: { model, close: vi.fn() }, context: withApp(app) });
    const rows = screen.getAllByRole('group', { name: /Watched folder/ });
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByRole('combobox', { name: 'Save to' })).toHaveTextContent('The watched folder');
    expect(within(rows[1]!).getByRole('combobox', { name: 'Save to' })).toHaveTextContent('Default save path');
    expect(within(rows[2]!).getByRole('combobox', { name: 'Folder for its torrents' })).toHaveValue('/dl/c');
    await userEvent.click(within(rows[0]!).getByRole('button', { name: 'Remove /watch/a' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add Folder' }));
    const added = screen.getAllByRole('group', { name: /Watched folder/ }).at(-1)!;
    await userEvent.type(within(added).getByRole('combobox', { name: 'Folder' }), '/watch/d');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(app.adding.appApi.setPreferences).toHaveBeenCalledWith({ scan_dirs: { '/watch/b': 1, '/watch/c': '/dl/c', '/watch/d': 1 } });
  });
});

describe('Network interface', () => {
  it('keeps the current interface even when it is missing, and sends the choice', async () => {
    const app = makeAppContext();
    app.adding.appApi.networkInterfaces.mockResolvedValue([{ name: 'Wi-Fi', value: 'en0' }]);
    app.adding.appApi.interfaceAddresses.mockResolvedValue(['192.168.1.2']);
    const { model } = await modelFor(app, { current_network_interface: 'utun9', current_interface_name: 'VPN', current_interface_address: '' });
    render(NetworkInterfaceDialog, { props: { model, close: vi.fn() }, context: withApp(app) });
    const iface = await screen.findByRole('combobox', { name: 'Interface' });
    expect(iface).toHaveTextContent('VPN');
    await userEvent.click(iface);
    await userEvent.click(screen.getByRole('option', { name: 'Wi-Fi' }));
    expect(app.adding.appApi.setPreferences).toHaveBeenCalledWith({ current_network_interface: 'en0', current_interface_address: '' });
    await userEvent.click(await screen.findByRole('combobox', { name: 'Address' }));
    await vi.waitFor(() => expect(screen.getByRole('option', { name: '192.168.1.2' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('option', { name: '192.168.1.2' }));
    expect(app.adding.appApi.setPreferences).toHaveBeenLastCalledWith({ current_interface_address: '192.168.1.2' });
  });
});

describe('Test email', () => {
  it('sends pending mail settings first, then a test email', async () => {
    const app = makeAppContext();
    app.adding.appApi.preferences.mockImplementation(async () => ({ ...structuredClone(fixture), mail_notification_enabled: true }));
    const show = vi.spyOn(app.toasts, 'show');
    render(PreferencesDialog, { props: { page: 'downloads', close: vi.fn() }, context: withApp(app) });
    await userEvent.click(await screen.findByRole('button', { name: /Email notification/ }));
    const sub = app.dialogs.stack.at(-1)!;
    (sub.props.oncustom as (def: unknown) => void)({ kind: 'custom', widget: 'testEmail', key: '@test_email', label: 'Send a test email' });
    await vi.waitFor(() => expect(app.adding.appApi.sendTestEmail).toHaveBeenCalled());
    expect(show).toHaveBeenCalledWith({ title: 'Test email sent' });
  });
});
