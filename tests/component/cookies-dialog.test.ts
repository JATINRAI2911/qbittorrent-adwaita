import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CookiesDialog from '../../src/features/tools/CookiesDialog.svelte';
import DateRow from '../../src/ui/adw/DateRow.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';

const future = 1_900_000_000; // not at a day's end: the round trip must keep it exact
const cookies = [
  { name: 'uid', domain: 'tracker.example', path: '/', value: 'user-secret-1', expirationDate: future },
  { name: 'pass', domain: 'tracker.example', path: '/', value: 'pass-secret-2', expirationDate: 0 },
];
const sessionSent = { name: 'pass', domain: 'tracker.example', path: '/', value: 'pass-secret-2' };

function setup() {
  const app = makeAppContext();
  app.adding.appApi.cookies.mockResolvedValue(structuredClone(cookies));
  const show = vi.spyOn(app.toasts, 'show');
  render(CookiesDialog, { props: { close: vi.fn() }, context: withApp(app) });
  return { app, show };
}

const cards = () => screen.getAllByRole('group', { name: /Cookie/ });

describe('DateRow', () => {
  it('wraps the day within the month', async () => {
    render(DateRow, { title: 'Expires on', value: '2031-02-28' });
    const day = screen.getByRole('spinbutton', { name: 'Expires on day' });
    day.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(day).toHaveValue('01');
    await userEvent.keyboard('{ArrowDown}');
    expect(day).toHaveValue('28');
  });

  it('edits a date in spin fields, clamping the day to the month', async () => {
    render(DateRow, { title: 'Expires on', value: '2031-01-31' });
    const month = screen.getByRole('spinbutton', { name: 'Expires on month' });
    expect(screen.getByRole('group', { name: 'Expires on' })).toContainElement(month);
    month.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('spinbutton', { name: 'Expires on day' })).toHaveValue('28');
    expect(screen.getByRole('spinbutton', { name: 'Expires on year' })).toHaveValue('2031');
  });
});

describe('CookiesDialog', () => {
  it('lists cookies with their values hidden, and reveals one on request', async () => {
    setup();
    await vi.waitFor(() => expect(cards()).toHaveLength(2));
    expect(within(cards()[0]!).getByText('tracker.example · uid')).toBeInTheDocument();
    const value = within(cards()[0]!).getByLabelText('Value');
    // Masked by CSS, not a password field: browsers would offer to save tracker cookies as logins.
    expect(value).toHaveAttribute('type', 'text');
    expect(value).toHaveAttribute('data-masked', 'true');
    await userEvent.click(within(cards()[0]!).getByRole('switch', { name: 'Show value' }));
    expect(value).toHaveAttribute('data-masked', 'false');
    expect(document.body.innerHTML).not.toMatch(/title="[^"]*secret/);
  });

  it('saves the whole set after an edit, without the value in any toast', async () => {
    const { app, show } = setup();
    await vi.waitFor(() => expect(cards()).toHaveLength(2));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    const value = within(cards()[1]!).getByLabelText('Value');
    await userEvent.clear(value);
    await userEvent.type(value, 'new-pass-3');
    await userEvent.click(save);
    expect(app.adding.appApi.setCookies).toHaveBeenCalledWith([cookies[0], { ...sessionSent, value: 'new-pass-3' }]);
    await vi.waitFor(() => expect(show).toHaveBeenCalledWith({ title: 'Saved cookies' }));
    expect(JSON.stringify(show.mock.calls)).not.toContain('secret');
  });

  it('adds and removes cookies, and won’t save one that is incomplete', async () => {
    const { app } = setup();
    await vi.waitFor(() => expect(cards()).toHaveLength(2));
    await userEvent.click(screen.getByRole('button', { name: 'Add Cookie' }));
    expect(cards()).toHaveLength(3);
    expect(within(cards()[2]!).getByText('Needs a name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(within(cards()[2]!).getByRole('button', { name: /Remove/ }));
    await userEvent.click(within(cards()[0]!).getByRole('button', { name: /Remove/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(app.adding.appApi.setCookies).toHaveBeenCalledWith([sessionSent]);
  });
});
