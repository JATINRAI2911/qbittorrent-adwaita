#!/usr/bin/env node
// README screenshots from the mock qBittorrent (made-up torrents only):
//   node scripts/screenshots.mjs        → docs/screenshots/*.png and demo.gif
//   node scripts/screenshots.mjs phone  → just docs/screenshots/phone-light-dark.png
// Starts scripts/mock-qbt.mjs and a Vite dev server pointed at it, then drives Chromium.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { chromium } from '@playwright/test';

const MOCK_PORT = 9100;
const UI_PORT = 5199;
const BASE = `http://127.0.0.1:${UI_PORT}`;
const OUT = 'docs/screenshots';
const MAGNET = 'magnet:?xt=urn:btih:a3f1c2d4e5b6978877665544332211ffeeddccbb&dn=debian-live-13.2.0-amd64';

const children = [];
function start(command, args, env = {}) {
  const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: 'ignore' });
  children.push(child);
  return child;
}
const stopAll = () => children.forEach((child) => child.kill());
process.on('exit', stopAll);

async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`${url} never came up`);
}

start('node', ['scripts/mock-qbt.mjs'], { PORT: String(MOCK_PORT) });
start('npx', ['vite', '--port', String(UI_PORT), '--strictPort', '--host', '127.0.0.1'], { QBT_URL: `http://127.0.0.1:${MOCK_PORT}` });
await waitFor(`http://127.0.0.1:${MOCK_PORT}/api/v2/app/version`);
await waitFor(BASE);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const settle = (page, ms = 700) => page.waitForTimeout(ms); // let enter animations and paint finish

async function session(scheme, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.getByRole('banner').waitFor();
  await page.locator('[data-hash]').first().waitFor();
  await page.mouse.move(640, 26); // on the header title: nothing hovered
  await run(page);
  await context.close();
}
const shot = async (page, name) => {
  await page.mouse.move(640, 26);
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png`);
};
const row = (page, name) => page.locator('[data-hash]').filter({ hasText: name }).first();

// The phone picture: one tilted phone whose screen is split diagonally, light above and dark below.
// Both halves come from one page with its data frozen (every poll answers "no changes"), so the
// rows line up across the split.
{
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.locator('[data-hash]').first().waitFor();
  await settle(page, 1500); // speeds settle into the subtitle and rows
  await page.route('**/api/v2/sync/maindata*', (route) => route.fulfill({ json: { rid: Number(new URL(route.request().url()).searchParams.get('rid')) } }));
  await settle(page, 1200);
  const light = await page.screenshot();
  await page.emulateMedia({ colorScheme: 'dark' });
  await settle(page);
  const dark = await page.screenshot();
  await context.close();

  const uri = (png) => `data:image/png;base64,${png.toString('base64')}`;
  const composer = await browser.newPage({ viewport: { width: 760, height: 1040 }, deviceScaleFactor: 2 });
  await composer.setContent(`<!doctype html><style>
    html, body { margin: 0; background: transparent; }
    .stage { width: 760px; height: 1040px; display: grid; place-items: center; perspective: 2400px; }
    .phone {
      position: relative; width: 393px; height: 852px; padding: 11px; border-radius: 60px;
      background: linear-gradient(150deg, #48484d, #18181a 40%, #0e0e10 70%, #3a3a3e);
      box-shadow: inset 0 0 0 1.5px rgb(255 255 255 / 18%), inset 0 0 0 5px #09090a,
        0 70px 80px -40px rgb(0 0 0 / 50%), 0 24px 36px -18px rgb(0 0 0 / 35%);
      transform: rotateX(12deg) rotateY(-16deg) rotateZ(8deg);
    }
    .phone::before, .phone::after { content: ''; position: absolute; right: -3px; width: 3px; border-radius: 0 3px 3px 0; background: #3a3a3e; }
    .phone::before { top: 180px; height: 84px; }
    .phone::after { top: 290px; height: 52px; }
    .screen { position: relative; height: 100%; border-radius: 49px; overflow: hidden; background: #fff; }
    .screen img { position: absolute; inset: 0; width: 100%; height: 100%; }
    .screen .dark { clip-path: polygon(100% 36%, 100% 100%, 0 100%, 0 64%); }
  </style><div class="stage"><div class="phone"><div class="screen">
    <img src="${uri(light)}" alt=""><img class="dark" src="${uri(dark)}" alt="">
  </div></div></div>`);
  await composer.waitForTimeout(300);
  const box = await composer.locator('.phone').boundingBox(); // the tilted outline
  const clip = { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 16), width: box.width + 48, height: box.height + 80 }; // room for the shadow
  await composer.screenshot({ path: `${OUT}/phone-light-dark.png`, omitBackground: true, clip });
  await composer.close();
  console.log(`${OUT}/phone-light-dark.png`);
}
if (process.argv[2] === 'phone') {
  // `node scripts/screenshots.mjs phone` retakes just this one.
  await browser.close();
  stopAll();
  process.exit(0);
}

await session('light', async (page) => {
  await shot(page, 'list-light');
  await page.keyboard.press('Alt+2');
  await page.getByRole('grid').waitFor();
  // Fewer columns, so the table fits the shot without scrolling sideways.
  await page.getByRole('button', { name: 'Ratio' }).click({ button: 'right' });
  for (const column of ['Peers', 'Tags', 'Added']) await page.getByRole('menuitemcheckbox', { name: column }).click();
  await page.keyboard.press('Escape');
  await shot(page, 'table-light');
  await page.keyboard.press('Alt+1');
  await page.keyboard.press('Control+,');
  const prefs = page.getByRole('dialog', { name: 'Preferences' });
  await prefs.getByRole('button', { name: 'Speed', exact: true }).click();
  await shot(page, 'preferences-light');
});

await session('dark', async (page) => {
  await shot(page, 'list-dark');

  await row(page, "Fleischer's Superman").click();
  await page.getByRole('region', { name: /details/i }).waitFor();
  await settle(page, 1500); // properties and the piece map load
  await shot(page, 'details-dark');
  const sheet = page.getByRole('region', { name: /details/i });
  await sheet.getByRole('radio', { name: /^Files/ }).click();
  await settle(page, 1000);
  // Episodes in view: fold the extras away and give the sheet more room.
  for (const folder of ['Extras', 'Subtitles']) await sheet.getByRole('button', { name: `Collapse ${folder}` }).click();
  await sheet.getByRole('separator', { name: /Resize/ }).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.evaluate(() => (document.activeElement)?.blur());
  await settle(page, 800);
  await shot(page, 'details-files-dark');
  await sheet.getByRole('separator', { name: /Resize/ }).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');


  await row(page, 'Night of the Living Dead').click({ modifiers: ['ControlOrMeta'] });
  await row(page, 'ubuntu-26.04').click({ modifiers: ['ControlOrMeta'] });
  await row(page, 'The Kid').click({ modifiers: ['ControlOrMeta'] });
  await shot(page, 'selection-dark');
  await page.keyboard.press('Escape');

  // A minute of speed history fills the graph.
  await page.waitForTimeout(60_000);
  await page.getByRole('button', { name: /^Status:/ }).click();
  await page.getByRole('img', { name: /Speed over the last minute/ }).waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/status-dark.png` });
  console.log(`${OUT}/status-dark.png`);
});

// The demo GIF: a short tour, recorded as video and converted with a palette for small files.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light', recordVideo: { dir: 'release/video', size: { width: 1280, height: 800 } } });
  const recordingFrom = Date.now();
  const page = await context.newPage();
  const pause = (ms = 1400) => page.waitForTimeout(ms);
  await page.goto(BASE);
  await page.locator('[data-hash]').first().waitFor();
  await page.mouse.move(640, 26);
  await pause(800);
  const lead = (Date.now() - recordingFrom) / 1000; // the blank page before the app showed: trimmed
  await pause(1200);
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowDown');
    await pause(260);
  }
  await page.keyboard.press('Enter');
  await pause(2600);
  await page.getByRole('region', { name: /details/i }).getByRole('radio', { name: /^Files/ }).click();
  await pause(1800);
  await page.keyboard.press('Escape');
  await pause(600);
  await page.getByRole('button', { name: /All Categories/ }).click();
  await pause(700);
  await page.getByRole('menuitemradio', { name: /^Classic Films/ }).click();
  await page.mouse.move(640, 26);
  await pause(1800);
  await page.getByRole('button', { name: /Classic Films/ }).click();
  await pause(500);
  await page.getByRole('menuitemradio', { name: /^All Categories/ }).click();
  await page.mouse.move(640, 26);
  await pause(800);
  await page.keyboard.type('iso', { delay: 160 });
  await pause(1800);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await pause(700);
  await page.keyboard.press('Alt+2');
  await pause(2000);
  await page.keyboard.press('Alt+1');
  await pause(700);
  await page.keyboard.press('Control+o');
  const add = page.getByRole('dialog', { name: 'Add Torrents' });
  await add.getByLabel('Magnet links or URLs').fill(MAGNET);
  await add.getByLabel('Magnet links or URLs').blur();
  await add.getByText('debian-live-13.2.0-amd64-gnome.iso').waitFor();
  await pause(2200);
  await page.keyboard.press('Escape');
  await pause(700);
  await page.emulateMedia({ colorScheme: 'dark' });
  await pause(2200);
  const video = await page.video().path();
  await context.close();
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-ss', lead.toFixed(2), '-i', video,
    '-vf', 'fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    `${OUT}/demo.gif`,
  ]);
  console.log(`${OUT}/demo.gif (${(statSync(`${OUT}/demo.gif`).size / 1024 / 1024).toFixed(1)} MB)`);
}

await browser.close();
stopAll();
process.exit(0);
