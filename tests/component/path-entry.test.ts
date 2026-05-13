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
    expect(options.map((o) => o.textContent?.trim())).toEqual(['me']);
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

  it('floats its suggestions in the window under the entry, so a dialog can’t clip them', async () => {
    const list = vi.fn(async () => ['/a/b']);
    const { container } = render(PathEntry, { title: 'Save path', value: '', list });
    const row = container.querySelector('.path-entry') as HTMLElement;
    row.getBoundingClientRect = () => ({ left: 100, top: 300, width: 320, height: 56, right: 420, bottom: 356, x: 100, y: 300, toJSON: () => ({}) });
    await userEvent.type(screen.getByRole('combobox', { name: 'Save path' }), '/a/');
    const listbox = await screen.findByRole('listbox', { name: 'Folders' });
    expect(listbox.style.position).toBe('fixed');
    expect([listbox.style.left, listbox.style.top, listbox.style.width]).toEqual(['100px', '360px', '320px']);
  });

  it('names each folder by itself, so long parent paths never push the name out of view', async () => {
    const deep = '/Volumes/Media Library/Television/Documentaries/Nature and Wildlife';
    const list = vi.fn(async () => [`${deep}/Planet Earth III`]);
    render(PathEntry, { title: 'Save path', value: '', list });
    const input = screen.getByRole('combobox', { name: 'Save path' });
    await userEvent.type(input, `${deep}/`);
    const option = await screen.findByRole('option');
    expect(option.textContent?.trim()).toBe('Planet Earth III');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input).toHaveValue(`${deep}/Planet Earth III/`);
    expect((input as HTMLInputElement).selectionStart).toBe(`${deep}/Planet Earth III/`.length);
  });
});
