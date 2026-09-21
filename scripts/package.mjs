#!/usr/bin/env node
// Builds the release archive: release/qbittorrent-adwaita-<version>.zip, holding a
// qbittorrent-adwaita/ folder that contains public/ - the folder layout qBittorrent expects.
//   npm run package
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `qbittorrent-adwaita-${version}`;
const staging = join('release', 'qbittorrent-adwaita');

if (!existsSync('dist/public/index.html')) throw new Error('Run `npm run build` first (dist/public/index.html is missing).');
// Only paths this script creates are removed, and only inside release/.
rmSync(staging, { recursive: true, force: true });
rmSync(join('release', `${name}.zip`), { force: true });
mkdirSync(staging, { recursive: true });
cpSync('dist/public', join(staging, 'public'), { recursive: true });
for (const file of ['LICENSE', 'README.md', 'CHANGELOG.md']) if (existsSync(file)) cpSync(file, join(staging, file));

execFileSync('zip', ['-qr', `${name}.zip`, 'qbittorrent-adwaita'], { cwd: 'release', stdio: 'inherit' });
rmSync(staging, { recursive: true, force: true });
console.log(`release/${name}.zip`);
