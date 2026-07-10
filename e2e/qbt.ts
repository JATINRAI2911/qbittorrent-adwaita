/**
 * A throwaway qbittorrent-nox 5.2 in Docker for the end-to-end suite. It never talks
 * to the user's instance: its own port, its own config and downloads under e2e/.tmp, no DHT/PeX/
 * LSD/UPnP, and known credentials that exist only here.
 */
import { execFileSync } from 'node:child_process';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const IMAGE = 'qbittorrentofficial/qbittorrent-nox:5.2.0-1';
export const CONTAINER = 'qbt-adwaita-e2e';
export const PORT = Number(process.env.E2E_PORT ?? 18080);
export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const USERNAME = 'e2e';
export const PASSWORD = 'e2e-password';

const ROOT = resolve('e2e/.tmp');
export const CONFIG_DIR = join(ROOT, 'config');
/** Mounted at /downloads: tests create source files here and check what deletes leave behind. */
export const DOWNLOADS_DIR = join(ROOT, 'downloads');
const DIST_DIR = resolve('dist');

/** qBittorrent's own format: PBKDF2-HMAC-SHA512, 100,000 rounds, 16-byte salt, 64-byte key. */
export function passwordHash(password: string): string {
  const salt = randomBytes(16);
  const key = pbkdf2Sync(password, salt, 100_000, 64, 'sha512');
  return `@ByteArray(${salt.toString('base64')}:${key.toString('base64')})`;
}

function config(): string {
  return [
    '[BitTorrent]',
    'Session\\DefaultSavePath=/downloads',
    'Session\\TempPath=/downloads/temp',
    'Session\\Port=6881',
    'Session\\DHTEnabled=false',
    'Session\\PeXEnabled=false',
    'Session\\LSDEnabled=false',
    '',
    '[Network]',
    'PortForwardingEnabled=false',
    '',
    '[Preferences]',
    'WebUI\\Port=8080',
    `WebUI\\Username=${USERNAME}`,
    `WebUI\\Password_PBKDF2="${passwordHash(PASSWORD)}"`,
    'WebUI\\HostHeaderValidation=false',
    'WebUI\\AlternativeUIEnabled=true',
    'WebUI\\RootFolder=/webui',
    '',
  ].join('\n');
}

const docker = (...args: string[]) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export function stopQbt(): void {
  try {
    docker('rm', '-f', CONTAINER);
  } catch {
    // Not running.
  }
}

export async function startQbt(): Promise<void> {
  stopQbt();
  rmSync(ROOT, { recursive: true, force: true });
  mkdirSync(join(CONFIG_DIR, 'qBittorrent', 'config'), { recursive: true });
  mkdirSync(DOWNLOADS_DIR, { recursive: true });
  writeFileSync(join(CONFIG_DIR, 'qBittorrent', 'config', 'qBittorrent.conf'), config());
  docker(
    'run', '-d', '--name', CONTAINER,
    '-p', `127.0.0.1:${PORT}:8080`,
    '-e', 'QBT_LEGAL_NOTICE=confirm',
    '-e', `PUID=${process.getuid?.() ?? 1000}`,
    '-e', `PGID=${process.getgid?.() ?? 1000}`,
    '-v', `${CONFIG_DIR}:/config`,
    '-v', `${DOWNLOADS_DIR}:/downloads`,
    '-v', `${DIST_DIR}:/webui:ro`,
    IMAGE,
  );
  await waitForApi();
}

export async function waitForApi(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/v2/app/version`);
      if (response.status === 200 || response.status === 403) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`qbittorrent-nox did not answer on ${BASE_URL} within ${timeoutMs} ms`);
}

/** Freezes the container (the API stops answering) without losing its state. */
export const pauseQbt = () => docker('pause', CONTAINER);
export const unpauseQbt = () => docker('unpause', CONTAINER);
