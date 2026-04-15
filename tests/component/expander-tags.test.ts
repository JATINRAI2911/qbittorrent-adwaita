import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import TagPicker from '../../src/features/add/TagPicker.svelte';
import ExpanderRow from '../../src/ui/adw/ExpanderRow.svelte';

const body = createRawSnippet(() => ({ render: () => '<p>Hidden options</p>' }));

describe('ExpanderRow', () => {
  it('reveals its content', async () => {
    render(ExpanderRow, { title: 'Advanced', subtitle: 'Layout, limits and more', children: body });
    const toggle = screen.getByRole('button', { name: /Advanced/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Hidden options')).toBeNull();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Hidden options')).toBeInTheDocument();
  });
});

describe('TagPicker', () => {
  it('toggles existing tags and adds new ones', async () => {
    const view = render(TagPicker, { tags: ['keep', 'hd'], selected: ['hd'] });
    expect(screen.getByRole('button', { name: 'hd' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'keep' }));
    expect(screen.getByRole('button', { name: 'keep' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(screen.getByRole('textbox', { name: 'New tag' }), 'fresh{Enter}');
    expect(screen.getByRole('button', { name: 'fresh' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.type(screen.getByRole('textbox', { name: 'New tag' }), 'a,b{Enter}');
    expect(screen.getByText('Tag names can’t contain commas.')).toBeInTheDocument();
    void view;
  });
});
