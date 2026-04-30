import { render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import StatisticsDialog from '../../src/features/global/StatisticsDialog.svelte';
import { makeAppContext, withApp } from '../fixtures/app-context';

describe('StatisticsDialog', () => {
  it('lists the figures and keeps them live', () => {
    const app = makeAppContext();
    app.session.server.total_peer_connections = 3;
    render(StatisticsDialog, { props: { close: vi.fn() }, context: withApp(app) });
    expect(screen.getByRole('dialog', { name: 'Statistics' })).toBeInTheDocument();
    expect(screen.getByText('Connected peers').nextElementSibling).toHaveTextContent('3');
    app.session.server.total_peer_connections = 7;
    flushSync();
    expect(screen.getByText('Connected peers').nextElementSibling).toHaveTextContent('7');
  });
});
