import { describe, expect, it } from 'vitest';
import { PREFERENCES } from '../../src/features/preferences/schema';
import { searchPreferences } from '../../src/features/preferences/search';
import fixture from '../fixtures/preferences-5.2.json';

const prefs = fixture as Record<string, unknown>;

describe('searchPreferences', () => {
  it('finds rows on every page by label, needing every word, in page order', () => {
    const results = searchPreferences('port forward', PREFERENCES, prefs);
    expect(results.map((r) => [r.def.page, r.def.key])).toEqual([
      ['connection', 'upnp'],
      ['webui', 'web_ui_upnp'],
      ['advanced', 'embedded_tracker_port_forwarding'],
    ]);
  });

  it('matches key names and subtitles too', () => {
    expect(searchPreferences('dl_limit', PREFERENCES, prefs).map((r) => r.def.key)).toEqual(['dl_limit', 'alt_dl_limit']);
    expect(searchPreferences('decentralized', PREFERENCES, prefs).map((r) => r.def.key)).toEqual(['dht']);
  });

  it('keeps rows hidden by another setting, dimmed, and says what they need', () => {
    const [result] = searchPreferences('incomplete torrents folder', PREFERENCES, prefs);
    expect(result).toMatchObject({ dimmed: true, def: { key: 'temp_path', needs: 'Keep incomplete torrents elsewhere' } });
  });

  it('finds rows inside sub-pages, but never the hidden RSS page', () => {
    expect(searchPreferences('smtp', PREFERENCES, prefs).map((r) => r.def.key)).toEqual(['mail_notification_smtp']);
    expect(searchPreferences('rss feeds', PREFERENCES, prefs)).toEqual([]);
  });

  it('finds nothing for blank or unknown queries', () => {
    expect(searchPreferences('   ', PREFERENCES, prefs)).toEqual([]);
    expect(searchPreferences('zzzz', PREFERENCES, prefs)).toEqual([]);
  });
});
