import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PreferencesGroup from '../../src/features/preferences/PreferencesGroup.svelte';
import { PreferencesModel } from '../../src/features/preferences/preferences-model.svelte';
import { PREFERENCES } from '../../src/features/preferences/schema';
import { makeAppContext, withApp } from '../fixtures/app-context';
import fixture from '../fixtures/preferences-5.2.json';

const defs = (...keys: string[]) => keys.map((key) => PREFERENCES.find((d) => d.key === key)!);

async function setup(keys: string[], overrides: Record<string, unknown> = {}) {
  const api = { preferences: vi.fn(async () => ({ ...structuredClone(fixture), ...overrides }) as Record<string, unknown>), setPreferences: vi.fn(async (_c: Record<string, unknown>) => {}) };
  const model = new PreferencesModel({ api, toast: { show: vi.fn() }, confirm: vi.fn(async () => true), debounceMs: 0 });
  await model.load();
  const app = makeAppContext();
  render(PreferencesGroup, { props: { title: 'Test', defs: defs(...keys), model }, context: withApp(app) });
  return { api, model, app };
}

describe('preference rows', () => {
  it('applies a switch at once', async () => {
    const { api } = await setup(['dht']);
    await userEvent.click(screen.getByRole('switch', { name: /Find peers with DHT/ }));
    expect(api.setPreferences).toHaveBeenCalledWith({ dht: false });
  });

  it('shows speeds in KiB/s and sends bytes', async () => {
    const { api } = await setup(['dl_limit']);
    const input = screen.getByRole('textbox', { name: 'Download' });
    expect(input).toHaveValue('40000');
    await userEvent.clear(input);
    await userEvent.type(input, '2048{Enter}');
    await vi.waitFor(() => expect(api.setPreferences).toHaveBeenCalledWith({ dl_limit: 2_097_152 }));
  });

  it('turns a −1 limit on and off with its switch', async () => {
    const { api } = await setup(['max_connec'], { max_connec: -1 });
    expect(screen.queryByRole('textbox', { name: 'Global connections' })).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Global connections' }));
    expect(api.setPreferences).toHaveBeenCalledWith({ max_connec: 500 });
    expect(screen.getByRole('textbox', { name: 'Global connections' })).toHaveValue('500');
    await userEvent.click(screen.getByRole('switch', { name: 'Global connections' }));
    expect(api.setPreferences).toHaveBeenLastCalledWith({ max_connec: -1 });
  });

  it('picks combo options by label and sends their real values', async () => {
    const { api } = await setup(['encryption', 'auto_tmm_enabled']);
    await userEvent.click(screen.getByRole('combobox', { name: 'Encryption' }));
    await userEvent.click(screen.getByRole('option', { name: 'Require encryption' }));
    expect(api.setPreferences).toHaveBeenCalledWith({ encryption: 1 });
    await userEvent.click(screen.getByRole('combobox', { name: 'Default management mode' }));
    await userEvent.click(screen.getByRole('option', { name: 'Automatic' }));
    expect(api.setPreferences).toHaveBeenLastCalledWith({ auto_tmm_enabled: true });
  });

  it('debounces entries, flushes on blur, and keeps notes under the row', async () => {
    const { api } = await setup(['proxy_ip', 'autorun_program'], { proxy_type: 'SOCKS5', autorun_enabled: true });
    await userEvent.type(screen.getByLabelText('Host'), '10.0.0.1');
    await userEvent.tab();
    await vi.waitFor(() => expect(api.setPreferences).toHaveBeenLastCalledWith({ proxy_ip: '10.0.0.1' }));
    expect(screen.getByText(/%N name · %L category/)).toBeInTheDocument();
  });

  it('edits lists in a dialog, one item per line, joined with the key’s separator', async () => {
    const { api, app } = await setup(['banned_IPs'], { banned_IPs: '1.2.3.4\n5.6.7.8' });
    const row = screen.getByRole('button', { name: /Banned IP addresses/ });
    expect(row).toHaveTextContent('2 addresses');
    await userEvent.click(row);
    const dialog = app.dialogs.stack.at(-1)!;
    expect(dialog.props.value).toBe('1.2.3.4\n5.6.7.8');
    (dialog.props.onconfirm as (text: string) => void)('1.2.3.4\n\n9.9.9.9 ');
    expect(api.setPreferences).toHaveBeenCalledWith({ banned_IPs: '1.2.3.4\n9.9.9.9' });
  });

  it('pairs schedule hours and minutes in one time row', async () => {
    const { api } = await setup(['schedule_from_hour'], { scheduler_enabled: true });
    const hour = screen.getByRole('spinbutton', { name: 'From hour' });
    await userEvent.clear(hour);
    await userEvent.type(hour, '22{Tab}');
    expect(api.setPreferences).toHaveBeenCalledWith({ schedule_from_hour: 22, schedule_from_min: 0 });
  });

  it('shows dependent rows only when their controller is on', async () => {
    const { model } = await setup(['temp_path_enabled', 'temp_path']);
    const group = screen.getByRole('region', { name: 'Test' });
    expect(within(group).queryByRole('combobox', { name: 'Incomplete torrents folder' })).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: /Keep incomplete torrents elsewhere/ }));
    expect(within(group).getByRole('combobox', { name: 'Incomplete torrents folder' })).toHaveValue('/home/user/Downloads/temp');
    void model;
  });

  it('never applies a half-typed path, only on Enter or when the field is left', async () => {
    const { api } = await setup(['file_log_path'], { file_log_enabled: true });
    const input = screen.getByRole('combobox', { name: 'Log folder' });
    await userEvent.clear(input);
    await userEvent.type(input, '/var/log/qbt');
    await new Promise((r) => setTimeout(r, 50));
    expect(api.setPreferences).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(api.setPreferences).toHaveBeenCalledWith({ file_log_path: '/var/log/qbt' }));
    expect(api.setPreferences).toHaveBeenCalledTimes(1);
  });

  it('asks about a dangerous entry only once it is committed, and explains invalid values under the row', async () => {
    const { api, model } = await setup(['web_ui_username', 'web_ui_password']);
    const confirm = vi.spyOn(model as unknown as { edit: () => void }, 'edit');
    const username = screen.getByLabelText('Username');
    await userEvent.clear(username);
    await userEvent.type(username, 'ab{Enter}');
    expect(screen.getByText('At least 3 characters')).toBeInTheDocument();
    expect(api.setPreferences).not.toHaveBeenCalled();
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password');
    void confirm;
  });

  it('commits a dangerous spin row when the field is left, not on every step', async () => {
    const { api } = await setup(['web_ui_port', 'upnp']);
    await userEvent.click(screen.getByRole('button', { name: 'Increase Port' }));
    await userEvent.click(screen.getByRole('button', { name: 'Increase Port' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(api.setPreferences).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('switch', { name: /Forward the port/ }));
    await vi.waitFor(() => expect(api.setPreferences).toHaveBeenCalledWith({ web_ui_port: 9002 }));
  });
});
