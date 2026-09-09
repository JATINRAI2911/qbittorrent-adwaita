import { describe, expect, it } from 'vitest';
import { dangerMessage, webUiUrl } from '../../src/features/preferences/danger';
import { PREFERENCES, type PrefDef } from '../../src/features/preferences/schema';

const def = (key: string) => PREFERENCES.find((d) => d.key === key) as PrefDef;
const here = { protocol: 'http:', hostname: 'nas.local', port: '9000' };

describe('webUiUrl', () => {
  it('builds the address the Web UI will answer on after the change', () => {
    expect(webUiUrl({ web_ui_address: '*', web_ui_port: 8080, use_https: false }, here)).toBe('http://nas.local:8080/');
    expect(webUiUrl({ web_ui_address: '192.168.1.5', web_ui_port: 9000, use_https: true }, here)).toBe('https://192.168.1.5:9000/');
    expect(webUiUrl({ web_ui_address: '::1', web_ui_port: 9000, use_https: false }, here)).toBe('http://[::1]:9000/');
    expect(webUiUrl({ web_ui_address: '0.0.0.0', web_ui_port: 9000, use_https: false }, here)).toBe('http://nas.local:9000/');
  });
});

describe('dangerMessage', () => {
  it('names the new URL for address, port and HTTPS changes', () => {
    const message = dangerMessage(def('web_ui_port'), { web_ui_address: '*', web_ui_port: 8080, use_https: false }, here);
    expect(message).toEqual({
      heading: 'Move the Web UI?',
      body: 'qBittorrent will answer at http://nas.local:8080/. This page will stop working; open the new address to continue.',
      confirmLabel: 'Move',
      url: 'http://nas.local:8080/',
    });
  });

  it('doesn’t promise an exact new address when the page is reached through a reverse proxy', () => {
    const proxied = { protocol: 'https:', hostname: 'home.example', port: '', pathname: '/qbittorrent/' };
    const message = dangerMessage(def('web_ui_port'), { web_ui_address: '*', web_ui_port: 8080, use_https: false }, proxied);
    expect(message.body).toBe('qBittorrent will listen on port 8080. This page reaches it through another address (a reverse proxy?), so it may stop working until that is updated too.');
    expect(message.url).toBeUndefined();
  });

  it('warns about logging in again for credentials and localhost bypass', () => {
    expect(dangerMessage(def('web_ui_username'), {}, here)).toMatchObject({ heading: 'Change the Username?', confirmLabel: 'Change' });
    expect(dangerMessage(def('web_ui_password'), {}, here).body).toContain('new password');
    expect(dangerMessage(def('bypass_local_auth'), { bypass_local_auth: false }, here)).toMatchObject({ heading: 'Require Login on This Computer?', confirmLabel: 'Require Login' });
  });

  it('explains that turning the alternative Web UI off leaves this interface', () => {
    expect(dangerMessage(def('alternative_webui_enabled'), { alternative_webui_enabled: false }, here)).toMatchObject({
      heading: 'Switch to the Built-in Web UI?',
      confirmLabel: 'Switch',
    });
    expect(dangerMessage(def('alternative_webui_path'), { alternative_webui_enabled: true, alternative_webui_path: '/srv/ui' }, here).body).toContain('/srv/ui');
  });
});
