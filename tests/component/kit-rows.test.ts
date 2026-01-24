import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ButtonRow from '../../src/ui/adw/ButtonRow.svelte';
import EntryRow from '../../src/ui/adw/EntryRow.svelte';
import WindowTitle from '../../src/ui/adw/WindowTitle.svelte';

describe('WindowTitle', () => {
  it('shows a bold title and a dimmed subtitle', () => {
    render(WindowTitle, { title: 'qBittorrent', subtitle: '3 downloading' });
    expect(screen.getByText('qBittorrent')).toHaveClass('title');
    expect(screen.getByText('3 downloading')).toHaveClass('subtitle');
  });

  it('omits an empty subtitle', () => {
    const { container } = render(WindowTitle, { title: 'qBittorrent', subtitle: '' });
    expect(container.querySelector('.subtitle')).toBeNull();
  });
});

describe('EntryRow', () => {
  it('labels its input with the row title and supports password fields', () => {
    render(EntryRow, { title: 'Password', type: 'password', name: 'password' });
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('name', 'password');
  });

  it('marks itself filled once the user types', async () => {
    const { container } = render(EntryRow, { title: 'Username' });
    await userEvent.type(screen.getByLabelText('Username'), 'admin');
    expect(container.querySelector('.entry-row')).toHaveClass('filled');
  });
});

describe('ButtonRow', () => {
  it('is a button with a title and optional subtitle', async () => {
    const onclick = vi.fn();
    render(ButtonRow, { title: 'Show All 30', subtitle: '22 more', onclick });
    const button = screen.getByRole('button', { name: /Show All 30/ });
    expect(button).toHaveTextContent('22 more');
    await userEvent.click(button);
    expect(onclick).toHaveBeenCalledTimes(1);
  });
});
