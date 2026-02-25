import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Login from '../../src/features/login/Login.svelte';
import type { LoginOutcome } from '../../src/state/session.svelte';

async function submitWith(outcome: LoginOutcome) {
  const onlogin = vi.fn(async () => outcome);
  render(Login, { onlogin });
  await userEvent.type(screen.getByLabelText('Username'), 'admin');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Log In' }));
  return onlogin;
}

describe('Login', () => {
  it('submits the typed credentials', async () => {
    const onlogin = await submitWith('ok');
    expect(onlogin).toHaveBeenCalledWith('admin', 'secret');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains wrong credentials and clears the password', async () => {
    await submitWith('invalid');
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('explains a temporary ban', async () => {
    await submitWith('banned');
    expect(await screen.findByRole('alert')).toHaveTextContent('temporarily banned');
  });

  it('explains when the server cannot be reached', async () => {
    await submitWith('network');
    expect(await screen.findByRole('alert')).toHaveTextContent('Can’t reach qBittorrent');
  });

  it('prevents double submission while a login is pending', async () => {
    let finish!: (o: LoginOutcome) => void;
    const onlogin = vi.fn(() => new Promise<LoginOutcome>((r) => (finish = r)));
    render(Login, { onlogin });
    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    await userEvent.click(screen.getByRole('button', { name: 'Log In' }));
    expect(screen.getByRole('button', { name: 'Logging In…' })).toBeDisabled();
    await userEvent.keyboard('{Enter}');
    expect(onlogin).toHaveBeenCalledTimes(1);
    finish('ok');
  });

  it('stays busy after a successful login until the app takes over', async () => {
    await submitWith('ok');
    expect(screen.getByRole('button', { name: 'Logging In…' })).toBeDisabled();
  });
});
