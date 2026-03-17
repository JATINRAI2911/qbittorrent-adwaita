import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app-setup';
import { Session } from '../../src/state/session.svelte';
import { fakeTorrentApi } from '../fixtures/fake-api';
import { fakeClientData } from '../fixtures/fake-clientdata';
import { fakeDetailsApi } from '../fixtures/fake-details-api';

describe('createApp', () => {
  it('builds a details model whose actions refresh it', async () => {
    const session = new Session({ login: vi.fn(), logout: vi.fn(), maindata: vi.fn(), isHidden: () => false, onVisible: () => () => {} });
    const details = fakeDetailsApi();
    const app = createApp(session, fakeTorrentApi(), fakeClientData(), undefined, details);
    expect(app.details.sheet).toBe('closed');
    const refresh = vi.spyOn(app.details, 'refresh');
    await app.detailCommands.setComment('h', 'x');
    expect(details.setComment).toHaveBeenCalledWith(['h'], 'x');
    expect(refresh).toHaveBeenCalled();
    app.details.dispose();
  });
});
