import type { PrefDef, Prefs } from './schema';

export interface DangerMessage {
  heading: string;
  body: string;
  confirmLabel: string;
  /** For address, port and HTTPS changes: where the Web UI will answer afterwards. */
  url?: string;
}

type Here = Pick<Location, 'protocol' | 'hostname' | 'port'> & { pathname?: string };

/** A page served under a path (qBittorrent itself serves at "/") is behind a reverse proxy. */
const behindProxy = (here: Here) => (here.pathname ?? '/') !== '/';
const ANY_ADDRESS = new Set(['', '*', '0.0.0.0', '::']);

/** The Web UI's address once `prefs` apply: listening on any address keeps this page's host. */
export function webUiUrl(prefs: Prefs, here: Here): string {
  const address = String(prefs.web_ui_address ?? '').trim();
  const host = ANY_ADDRESS.has(address) ? here.hostname : address.includes(':') ? `[${address}]` : address;
  const port = String(prefs.web_ui_port ?? here.port);
  return `${prefs.use_https === true ? 'https' : 'http'}://${host}:${port}/`;
}

/** What confirming a dangerous preference will do, in words; `prefs` holds the values after it. */
export function dangerMessage(def: PrefDef, prefs: Prefs, here: Here): DangerMessage {
  switch (def.dangerous) {
    case 'url': {
      if (behindProxy(here)) {
        const port = String(prefs.web_ui_port ?? here.port);
        return {
          heading: 'Move the Web UI?',
          body: `qBittorrent will listen on port ${port}. This page reaches it through another address (a reverse proxy?), so it may stop working until that is updated too.`,
          confirmLabel: 'Move',
        };
      }
      const url = webUiUrl(prefs, here);
      return { heading: 'Move the Web UI?', body: `qBittorrent will answer at ${url}. This page will stop working; open the new address to continue.`, confirmLabel: 'Move', url };
    }
    case 'auth':
      if (def.key === 'bypass_local_auth') {
        return {
          heading: 'Require Login on This Computer?',
          body: 'Apps and browsers on the computer running qBittorrent will have to log in. Make sure you know the username and password.',
          confirmLabel: 'Require Login',
        };
      }
      return def.key === 'web_ui_password'
        ? { heading: 'Change the Password?', body: 'You’ll need the new password the next time you log in.', confirmLabel: 'Change' }
        : { heading: 'Change the Username?', body: 'You’ll need the new username the next time you log in.', confirmLabel: 'Change' };
    case 'webui':
      if (prefs.alternative_webui_enabled !== true) {
        return {
          heading: 'Switch to the Built-in Web UI?',
          body: 'qBittorrent will serve its own Web UI instead of this one. Reload the page to continue there.',
          confirmLabel: 'Switch',
        };
      }
      return {
        heading: 'Change the Web UI Files?',
        body: `qBittorrent will serve the Web UI from ${String(prefs.alternative_webui_path || 'the chosen folder')}. If that folder has no index.html, qBittorrent turns the alternative Web UI off.`,
        confirmLabel: 'Change',
      };
    default:
      return { heading: `Change “${def.label}”?`, body: '', confirmLabel: 'Change' };
  }
}
