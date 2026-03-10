import { describe, expect, it } from 'vitest';
import type { Peer } from '../../src/api/details';
import { applyPeers, countryFlag } from '../../src/sync/peers';

describe('applyPeers', () => {
  it('fills from a full update, patches in place, removes, and clears on the next full update', () => {
    const state = new Map<string, Peer>();
    applyPeers(state, { rid: 1, full_update: true, peers: { '1.1.1.1:1': { client: 'qB', dl_speed: 5 }, '2.2.2.2:2': { client: 'Tr' } } });
    const first = state.get('1.1.1.1:1')!;
    expect(first).toMatchObject({ client: 'qB', dl_speed: 5, up_speed: 0, flags: '' });
    applyPeers(state, { rid: 2, peers: { '1.1.1.1:1': { dl_speed: 9 } }, peers_removed: ['2.2.2.2:2'] });
    expect(state.get('1.1.1.1:1')).toBe(first);
    expect(first.dl_speed).toBe(9);
    expect([...state.keys()]).toEqual(['1.1.1.1:1']);
    applyPeers(state, { rid: 3, full_update: true, peers: { '3.3.3.3:3': {} } });
    expect([...state.keys()]).toEqual(['3.3.3.3:3']);
  });

  it('wraps new peers with the create function', () => {
    const state = new Map<string, Peer>();
    const created: Peer[] = [];
    applyPeers(state, { rid: 1, full_update: true, peers: { a: { client: 'x' } } }, (p) => (created.push(p), p));
    expect(created).toHaveLength(1);
  });
});

describe('countryFlag', () => {
  it('turns a country code into a flag emoji, or nothing', () => {
    expect(countryFlag('de')).toBe('🇩🇪');
    expect(countryFlag('US')).toBe('🇺🇸');
    expect(countryFlag('')).toBe('');
    expect(countryFlag(undefined)).toBe('');
    expect(countryFlag('x1')).toBe('');
  });
});
