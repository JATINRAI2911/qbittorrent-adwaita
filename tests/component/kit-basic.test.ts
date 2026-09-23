import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Banner from '../../src/ui/adw/Banner.svelte';
import Button from '../../src/ui/adw/Button.svelte';
import ProgressBar from '../../src/ui/adw/ProgressBar.svelte';
import StatusPage from '../../src/ui/adw/StatusPage.svelte';

describe('Button', () => {
  it('renders a text button', () => {
    render(Button, { label: 'Log In' });
    expect(screen.getByRole('button', { name: 'Log In' })).toHaveClass('btn', 'text-button');
  });

  it('labels icon-only buttons from their title', () => {
    render(Button, { icon: 'pause', title: 'Stop' });
    expect(screen.getByRole('button', { name: 'Stop' })).toHaveClass('image-button');
  });

  it('applies variant classes and handles clicks', async () => {
    const onclick = vi.fn();
    render(Button, { label: 'Retry Now', variant: 'suggested', pill: true, onclick });
    const button = screen.getByRole('button', { name: 'Retry Now' });
    expect(button).toHaveClass('suggested-action', 'pill');
    await userEvent.click(button);
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onclick = vi.fn();
    render(Button, { label: 'Nope', disabled: true, onclick });
    await userEvent.click(screen.getByRole('button', { name: 'Nope' }));
    expect(onclick).not.toHaveBeenCalled();
  });
});

describe('ProgressBar', () => {
  it('exposes a clamped value and a tone class', () => {
    const { container } = render(ProgressBar, { value: 1.7, tone: 'warning', label: 'Progress' });
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toHaveAttribute('aria-valuenow', '100');
    expect(container.querySelector('.fill')).toHaveClass('tone-warning');
  });

  it('treats NaN as zero', () => {
    render(ProgressBar, { value: Number.NaN, label: 'P' });
    expect(screen.getByRole('progressbar', { name: 'P' })).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('StatusPage', () => {
  it('shows a title and description', () => {
    render(StatusPage, { icon: 'magnet', title: 'No Torrents', description: 'Torrents you add will appear here.' });
    expect(screen.getByRole('heading', { name: 'No Torrents' })).toHaveClass('title-1');
    expect(screen.getByText('Torrents you add will appear here.')).toBeInTheDocument();
  });
});

describe('Banner', () => {
  it('is announced as an alert and runs its action', async () => {
    const onaction = vi.fn();
    render(Banner, { title: 'Can’t reach qBittorrent.', actionLabel: 'Retry Now', tone: 'error', onaction });
    expect(screen.getByRole('alert')).toHaveTextContent('Can’t reach qBittorrent.');
    await userEvent.click(screen.getByRole('button', { name: 'Retry Now' }));
    expect(onaction).toHaveBeenCalledTimes(1);
  });

  it('shows a changing detail (a countdown) without putting it in the alert', () => {
    render(Banner, { title: 'Can’t reach qBittorrent.', detail: 'Retrying in 4 s…', tone: 'error' });
    expect(screen.getByText('Retrying in 4 s…')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(/^Can’t reach qBittorrent\.$/);
  });

  it('keeps a space between the title and the detail', () => {
    render(Banner, { title: 'Can’t reach qBittorrent.', detail: 'Retrying in 4 s…', tone: 'error' });
    expect(screen.getByRole('alert').parentElement?.textContent).toBe('Can’t reach qBittorrent. Retrying in 4 s…');
  });
});
