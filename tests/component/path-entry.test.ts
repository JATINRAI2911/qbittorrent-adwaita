import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PathEntry from '../../src/features/paths/PathEntry.svelte';

describe('PathEntry', () => {
  it('suggests folders from the server and completes with the keyboard', async () => {
    const list = vi.fn(async (dir: string) => (dir === '/Users/' ? ['/Users/me', '/Users/shared'] : []));
    render(PathEntry, { title: 'Save path', value: '', list });
    const input = screen.getByRole('combobox', { name: 'Save path' });
    await userEvent.type(input, '/Users/m');
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['/Users/me']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveValue('/Users/me/');
    expect(list).toHaveBeenCalledWith('/Users/');
  });

  it('closes its suggestions with Escape without letting the key reach the dialog', async () => {
    const list = vi.fn(async () => ['/a/b']);
    const outer = vi.fn();
    window.addEventListener('keydown', outer);
    render(PathEntry, { title: 'Save path', value: '', list });
    await userEvent.type(screen.getByRole('combobox', { name: 'Save path' }), '/a/');
    await screen.findByRole('option');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('option')).toBeNull();
    expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
    window.removeEventListener('keydown', outer);
  });

  it('shows no suggestions when the folder does not exist', async () => {
    const list = vi.fn(async () => Promise.reject(new Error('Directory does not exist')));
    render(PathEntry, { title: 'Save path', value: '', list });
    await userEvent.type(screen.getByRole('combobox', { name: 'Save path' }), '/nope/x');
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.queryByRole('option')).toBeNull();
  });
});
