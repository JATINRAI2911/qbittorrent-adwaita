import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoriesDialog from '../../src/features/actions/CategoriesDialog.svelte';
import CategoryDialog from '../../src/features/actions/CategoryDialog.svelte';
import TagsDialog from '../../src/features/actions/TagsDialog.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';
import { makeTorrent } from '../fixtures/torrents';

describe('CategoryDialog', () => {
  const folderSetting = () => screen.getByRole('combobox', { name: 'Use incomplete folder' });

  it('creates a category with its own incomplete folder', async () => {
    const onconfirm = vi.fn();
    render(CategoryDialog, { onconfirm, close: vi.fn() });
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Use “/” in the name for a subcategory, like “Linux/ISOs”.');
    await userEvent.type(screen.getByLabelText('Name'), 'TV');
    await userEvent.type(screen.getByRole('combobox', { name: 'Save path' }), '/tv');
    await userEvent.click(folderSetting());
    await userEvent.click(screen.getByRole('option', { name: 'Yes' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Incomplete folder' }), '/tv/inc');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onconfirm).toHaveBeenCalledWith({ name: 'TV', savePath: '/tv', download: { enabled: true, path: '/tv/inc' } });
  });

  it('creates categories that follow the global incomplete-folder setting by default', async () => {
    const onconfirm = vi.fn();
    render(CategoryDialog, { onconfirm, close: vi.fn() });
    expect(folderSetting()).toHaveTextContent('Default');
    await userEvent.type(screen.getByLabelText('Name'), 'TV');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onconfirm).toHaveBeenCalledWith({ name: 'TV', savePath: '', download: null });
  });

  it('edits an existing category without renaming it or changing its folder setting', async () => {
    const onconfirm = vi.fn();
    render(CategoryDialog, { category: { name: 'TV', savePath: '/tv', download_path: '/tv/inc' }, onconfirm, close: vi.fn() });
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(folderSetting()).toHaveTextContent('Yes');
    await userEvent.clear(screen.getByRole('combobox', { name: 'Save path' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Save path' }), '/media/tv');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onconfirm).toHaveBeenCalledWith({ name: 'TV', savePath: '/media/tv', download: { enabled: true, path: '/tv/inc' } });
  });

  it.each([
    [undefined, 'Default', null],
    [false as const, 'No', { enabled: false, path: '' }],
    ['', 'Yes', { enabled: true, path: '' }],
  ])('keeps download_path %j as “%s” when saved unchanged', async (downloadPath, shown, sent) => {
    const onconfirm = vi.fn();
    render(CategoryDialog, { category: { name: 'TV', savePath: '/tv', download_path: downloadPath }, onconfirm, close: vi.fn() });
    expect(folderSetting()).toHaveTextContent(shown);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onconfirm).toHaveBeenCalledWith({ name: 'TV', savePath: '/tv', download: sent });
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
