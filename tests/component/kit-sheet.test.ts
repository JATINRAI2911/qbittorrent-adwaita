import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import BottomSheet from '../../src/ui/adw/BottomSheet.svelte';
import CheckButton from '../../src/ui/adw/CheckButton.svelte';
import ToggleGroup from '../../src/ui/adw/ToggleGroup.svelte';

const text = (t: string) => createRawSnippet(() => ({ render: () => `<p>${t}</p>` }));

function sheet(mode: 'open' | 'bar', height = 0.5) {
  const onresize = vi.fn();
  const oncollapse = vi.fn();
  render(BottomSheet, { props: { mode, height, label: 'Details', onresize, oncollapse, head: text('Head'), bar: text('Bar'), children: text('Body') } });
  return { onresize, oncollapse };
}

describe('BottomSheet', () => {
  it('shows head and body when open, sized by its fraction of the window', () => {
    sheet('open', 0.4);
    // jsdom can't compute vh, so read the inline style.
    expect(screen.getByRole('region', { name: 'Details' }).getAttribute('style')).toContain('height: 40vh');
    expect(screen.getByText('Head')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.queryByText('Bar')).toBeNull();
  });

  it('shows only the bar when collapsed', () => {
    sheet('bar');
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('resizes with the arrow keys on the handle', async () => {
    const { onresize } = sheet('open', 0.5);
    screen.getByRole('separator', { name: 'Resize details' }).focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onresize).toHaveBeenLastCalledWith(0.55);
  });

  it('resizes by dragging and collapses when dragged below a quarter', async () => {
    const { onresize, oncollapse } = sheet('open', 0.5);
    const handle = screen.getByRole('separator', { name: 'Resize details' });
    const h = window.innerHeight;
    await fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientY: 400 - h * 0.2, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 400 - h * 0.2, pointerId: 1 });
    expect(onresize.mock.calls.at(-1)![0]).toBeCloseTo(0.7);
    await fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });
    await fireEvent.pointerUp(handle, { clientY: 400 + h * 0.3, pointerId: 1 });
    expect(oncollapse).toHaveBeenCalled();
  });
});

describe('BottomSheet drag handle', () => {
  it('drags with the primary button only, and a plain click changes nothing', async () => {
    const { onresize, oncollapse } = sheet('open', 0.5);
    const handle = screen.getByRole('separator', { name: 'Resize details' });
    await fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1, button: 2 });
    await fireEvent.pointerUp(handle, { clientY: 100, pointerId: 1, button: 2 });
    await fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1, button: 0 });
    await fireEvent.pointerUp(handle, { clientY: 400, pointerId: 1, button: 0 });
    expect(onresize).not.toHaveBeenCalled();
    expect(oncollapse).not.toHaveBeenCalled();
  });

  it('drops a drag whose pointer capture is lost', async () => {
    const { onresize } = sheet('open', 0.5);
    const handle = screen.getByRole('separator', { name: 'Resize details' });
    await fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });
    await fireEvent.pointerMove(handle, { clientY: 200, pointerId: 1 });
    handle.dispatchEvent(new Event('lostpointercapture'));
    await fireEvent.pointerUp(handle, { clientY: 200, pointerId: 1 });
    expect(onresize).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Details' }).getAttribute('style')).toContain('height: 50vh');
  });

  it('says it will minimize once dragged low enough', async () => {
    sheet('open', 0.5);
    const handle = screen.getByRole('separator', { name: 'Resize details' });
    await fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 });
    expect(screen.queryByText('Release to minimize')).toBeNull();
    await fireEvent.pointerMove(handle, { clientY: 400 + window.innerHeight * 0.3, pointerId: 1 });
    expect(screen.getByText('Release to minimize')).toBeInTheDocument();
  });
});

describe('CheckButton', () => {
  it('is a tri-state checkbox', async () => {
    const onclick = vi.fn();
    render(CheckButton, { checked: 'mixed', label: 'Select Extras', onclick });
    const box = screen.getByRole('checkbox', { name: 'Select Extras' });
    expect(box).toHaveAttribute('aria-checked', 'mixed');
    expect(box).toHaveClass('indeterminate');
    await userEvent.click(box);
    expect(onclick).toHaveBeenCalled();
  });
});

describe('ToggleGroup badge', () => {
  it('shows a dot with an accessible label', () => {
    render(ToggleGroup, { label: 'Tabs', options: [{ value: 'a', label: 'Trackers', badge: 'has errors' }], value: 'a', onchange: vi.fn() });
    expect(screen.getByRole('radio', { name: 'Trackers, has errors' })).toBeInTheDocument();
  });
});
