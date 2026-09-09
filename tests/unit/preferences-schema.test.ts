import { describe, expect, it } from 'vitest';
import { HIDDEN_PAGES, PAGES, PREFERENCES, WRITE_ONLY, coveredKeys, type PrefDef } from '../../src/features/preferences/schema';
import fixture from '../fixtures/preferences-5.2.json';

const prefs = fixture as Record<string, unknown>;
const fixtureKeys = Object.keys(prefs).sort();

describe('preferences schema', () => {
  it('covers every key qBittorrent 5.2 returns, and nothing it does not', () => {
    const covered = [...coveredKeys()].sort();
    expect(fixtureKeys.filter((key) => !covered.includes(key))).toEqual([]);
    expect(covered.filter((key) => !fixtureKeys.includes(key) && !WRITE_ONLY.includes(key))).toEqual([]);
    expect(fixtureKeys).toHaveLength(223);
  });

  it('gives each key exactly one row', () => {
    const rowKeys = PREFERENCES.map((def) => def.key);
    expect(rowKeys.filter((key, i) => rowKeys.indexOf(key) !== i)).toEqual([]);
  });

  it('puts visible rows on every visible page, and hides RSS until v2', () => {
    for (const page of PAGES.filter((p) => !HIDDEN_PAGES.includes(p.id))) {
      expect(PREFERENCES.some((def) => def.page === page.id && def.visibleWhen?.(prefs) !== false), page.id).toBe(true);
    }
    expect(HIDDEN_PAGES).toEqual(['rss']);
  });

  it('offers the current value of every combo as one of its options', () => {
    const combos = PREFERENCES.filter((def): def is Extract<PrefDef, { kind: 'combo' }> => def.kind === 'combo');
    for (const def of combos) {
      expect(def.options.map((o) => o.value), def.key).toContain(prefs[def.key]);
    }
  });

  it('marks the dangerous keys, plus the HTTPS certificate and key (they move the Web UI while HTTPS is on)', () => {
    expect(PREFERENCES.filter((def) => def.dangerous).map((def) => def.key).sort()).toEqual(
      [
        'alternative_webui_enabled', 'alternative_webui_path', 'bypass_local_auth', 'use_https', 'web_ui_address', 'web_ui_password', 'web_ui_port', 'web_ui_username',
        'web_ui_https_cert_path', 'web_ui_https_key_path',
      ].sort(),
    );
  });

  it('labels every row, without the stock trailing colons', () => {
    for (const def of PREFERENCES) {
      expect(def.label.trim(), def.key).not.toBe('');
      expect(def.label.endsWith(':'), def.key).toBe(false);
    }
  });

  it('bounds numbers like qBittorrent does', () => {
    const spin = (key: string) => PREFERENCES.find((d) => d.key === key) as Extract<PrefDef, { kind: 'spin' }>;
    expect(spin('checking_memory_use').max).toBe(1024);
    expect(spin('peer_turnover_interval').max).toBe(3600);
    for (const key of ['slow_torrent_dl_rate_threshold', 'slow_torrent_ul_rate_threshold', 'slow_torrent_inactive_timer']) expect(spin(key).min, key).toBe(1);
  });

  it('offers proxy credentials only for proxy types that use them', () => {
    const shown = (key: string, p: Record<string, unknown>) => PREFERENCES.find((d) => d.key === key)!.visibleWhen!(p);
    // A SOCKS4 proxy has no authentication, even if proxy_auth_enabled was left on from an earlier type.
    expect(shown('proxy_username', { proxy_type: 'SOCKS4', proxy_auth_enabled: true })).toBe(false);
    expect(shown('proxy_password', { proxy_type: 'SOCKS4', proxy_auth_enabled: true })).toBe(false);
    expect(shown('proxy_username', { proxy_type: 'SOCKS5', proxy_auth_enabled: true })).toBe(true);
  });
});

