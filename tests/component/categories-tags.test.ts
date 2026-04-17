import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoriesDialog from '../../src/features/actions/CategoriesDialog.svelte';
import CategoryDialog from '../../src/features/actions/CategoryDialog.svelte';
import TagsDialog from '../../src/features/actions/TagsDialog.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

describe('CategoryDialog', () => {
  it('creates a category with an optional incomplete folder', async () => {
    const onconfirm = vi.fn();
    render(CategoryDialog, { onconfirm, close: vi.fn() });
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Name'), 'TV');
    await userEvent.type(screen.getByRole('combobox', { name: 'Save path' }), '/tv');
    await userEvent.click(screen.getByRole('switch', { name: /incomplete folder/ }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Incomplete folder' }), '/tv/inc');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onconfirm).toHaveBeenCalledWith({ name: 'TV', savePath: '/tv', download: { enabled: true, path: '/tv/inc' } });
  });

  it('edits an existing category without renaming it', async () => {
    const onconfirm = vi.fn();
    render(CategoryDialog, { category: { name: 'TV', savePath: '/tv', download_path: '/tv/inc' }, onconfirm, close: vi.fn() });
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByRole('switch', { name: /incomplete folder/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.clear(screen.getByRole('combobox', { name: 'Save path' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Save path' }), '/media/tv');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onconfirm).toHaveBeenCalledWith({ name: 'TV', savePath: '/media/tv', download: { enabled: true, path: '/tv/inc' } });
  });
});

describe('CategoriesDialog and TagsDialog', () => {
  function setup() {
    const app = makeAppContext([makeTorrent({ category: 'TV', tags: 'keep' }), makeTorrent({ category: 'TV', tags: 'keep, hd' })]);
    app.session.categories.set('TV', { name: 'TV', savePath: '/tv' });
    app.session.categories.set('Films', { name: 'Films', savePath: '' });
    app.session.tags.add('keep');
    app.session.tags.add('hd');
    return app;
  }

  it('lists categories with their torrent counts and removes after confirming', async () => {
    const app = setup();
    render(CategoriesDialog, { props: { close: vi.fn() }, context: withApp(app) });
    const rows = within(screen.getByRole('list', { name: 'Categories' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent?.replace(/\s+/g, ' ').trim())).toEqual([expect.stringContaining('Films'), expect.stringContaining('TV')]);
    expect(rows[1]).toHaveTextContent('2 torrents');
    await userEvent.click(screen.getByRole('button', { name: 'Edit TV' }));
    expect(app.openers.editCategory).toHaveBeenCalledWith({ name: 'TV', savePath: '/tv' });
    await userEvent.click(screen.getByRole('button', { name: 'Remove TV' }));
    (app.dialogs.stack.at(-1)!.props.onresponse as (id: string) => void)('remove');
    expect(app.commands.removeCategories).toHaveBeenCalledWith(['TV']);
    await userEvent.click(screen.getByRole('button', { name: 'New Category…' }));
    expect(app.openers.newCategory).toHaveBeenCalledWith([]);
  });

  it('lists tags and deletes after confirming', async () => {
    const app = setup();
    render(TagsDialog, { props: { close: vi.fn() }, context: withApp(app) });
    expect(within(screen.getByRole('list', { name: 'Tags' })).getAllByRole('listitem').map((r) => r.textContent?.includes('2 torrents'))).toEqual([false, true]);
    await userEvent.click(screen.getByRole('button', { name: 'Delete keep' }));
    (app.dialogs.stack.at(-1)!.props.onresponse as (id: string) => void)('delete');
    expect(app.commands.deleteTags).toHaveBeenCalledWith(['keep']);
  });
});
