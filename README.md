# qBittorrent Adwaita WebUI

An alternative Web UI for qBittorrent 5.2+ that looks and behaves like a GNOME (GTK4/libadwaita) app, in light and dark.

It covers what the stock Web UI does, built for big libraries:
- a grouped list (or a sortable, virtualized table) with filters, search and selection mode;
- a details sheet with overview, files, trackers, peers and HTTP sources;
- adding by file, magnet, URL, paste or drop, with a preview and per-file choices;
- all of qBittorrent's preferences, applied as you change them, with confirmations for the ones that could lock you out;
- speed limits, statistics, the execution log, a torrent creator, cookies, and keyboard shortcuts for everything common.

Tracker passkeys are masked wherever they are shown. The only thing the UI stores is its own view settings: in qBittorrent (through `clientdata`), cached in the browser's local storage.

## Screenshots

![The torrent list, grouped by state, in the dark theme](docs/screenshots/list-dark.png)

| | |
|---|---|
| ![The torrent list in the light theme](docs/screenshots/list-light.png) | ![The table view with sortable columns](docs/screenshots/table-light.png) |
| ![The details sheet: overview with the piece map](docs/screenshots/details-dark.png) | ![The details sheet: files with priorities](docs/screenshots/details-files-dark.png) |
| ![The torrent list in the dark theme](docs/screenshots/list-dark.png) | ![Selection mode with the action bar](docs/screenshots/selection-dark.png) |
| ![The status popover with the speed graph](docs/screenshots/status-dark.png) | ![Preferences, Speed page](docs/screenshots/preferences-light.png) |

The torrents in these pictures are made up (`npm run mock` serves them; `npm run screenshots` retakes the pictures).

## Install

You need qBittorrent 5.2 or newer with its Web UI enabled, and Node.js 22+ to build.

1. Build it:

   ```bash
   git clone https://github.com/jatinrai2911/qbittorrent-adwaita.git
   cd qbittorrent-adwaita
   npm ci
   npm run build
   ```

   This produces a `dist` folder:

   ```
   dist/
   └── public/
       ├── index.html
       └── assets/…
   ```

2. Point qBittorrent at it: **Tools → Options → Web UI**, tick **Use alternative WebUI**, and set **Files location** to the **`dist`** folder, the one that *contains* `public/`, not `public/` itself. qBittorrent serves `public/` from there. Symlinks inside it are refused, so copy the folder if you move it.

   On a headless `qbittorrent-nox`, stop it and set these in `qBittorrent.conf`, under `[Preferences]`:

   ```ini
   WebUI\AlternativeUIEnabled=true
   WebUI\RootFolder=/path/to/qbittorrent-adwaita/dist
   ```

3. Open the Web UI address (for example `http://127.0.0.1:8080`) and log in with your Web UI credentials.

To update, pull and run `npm run build` again, then reload the page.

### Switching back

- **From this UI:** Preferences → Web UI → turn off *Use an alternative Web UI*.
- **From qBittorrent's window:** Tools → Options → Web UI → untick *Use alternative WebUI*.
- **Headless:** stop qBittorrent and set `WebUI\AlternativeUIEnabled=false` in `qBittorrent.conf`.
- **If nothing else works:** rename or delete `dist/public/index.html`. When the alternative UI's `index.html` is missing, qBittorrent turns it off by itself and serves the stock UI.

## Develop

```bash
npm install
QBT_URL=http://127.0.0.1:9000 npm run dev   # Vite dev server; proxies /api to qBittorrent, rewriting Origin/Referer for its CSRF check
```

Then open the printed local address. The UI is Svelte 5 + TypeScript, with a small libadwaita-style kit in `src/ui/adw`.

To try the UI without a qBittorrent, run a pretend one with made-up torrents:

```bash
npm run mock                                 # a fake qBittorrent API on 127.0.0.1:9100 (any login works)
QBT_URL=http://127.0.0.1:9100 npm run dev
```

To test against a snapshot of your own library (never committed):

```bash
QBT_USER=… QBT_PASS=… node scripts/record-maindata.mjs
npm test   # tests/unit/maindata-real.test.ts now runs against it
```

## Tests

```bash
npm test          # unit and component tests (Vitest + jsdom + Testing Library)
npm run check     # svelte-check: TypeScript and Svelte warnings fail the build
npm run e2e       # builds, then end-to-end tests in Chromium against qBittorrent in Docker
```

`npm run e2e` needs Docker. The first time, also run `npx playwright install chromium`. It works like this:
- It starts a throwaway `qbittorrentofficial/qbittorrent-nox:5.2.0-1` container on `127.0.0.1:18080`, with its own config and generated test credentials, serving this build as the alternative UI.
- It runs the flows (adding, start/stop, bulk category, delete, details, preferences, the creator, offline, modality), axe accessibility scans in light and dark, high-contrast and forced-colours checks, and a large Files tab.
- It removes the container afterwards. `E2E_KEEP=1` keeps it running for debugging.
- It never touches your own qBittorrent.

## Keyboard

| Keys | Action |
|---|---|
| ↑ / ↓ | Move between torrents |
| Shift + ↑ / ↓ | Extend the selection |
| Space | Start or stop |
| Delete / Backspace | Delete… |
| F2 | Rename… |
| Ctrl/Cmd + A | Select all |
| Ctrl/Cmd + F · type anywhere | Search |
| Ctrl/Cmd + O | Add torrents |
| Ctrl/Cmd + , | Preferences |
| Ctrl/Cmd + ? | Keyboard shortcuts |
| Paste (nothing focused) | Add magnet links or URLs |
| Alt + 1 / 2 (or Ctrl/Cmd + 1 / 2) | List / Table view |
| Enter | Open details |
| Esc | Close menu or dialog → clear search → close search → leave selection mode → close details |

Ctrl/Cmd + 1 / 2 usually switch browser tabs before the page sees them, hence Alt + 1 / 2.

## Accessibility

- Every screen is checked with axe (WCAG 2.1 AA) in light and dark, including dimmed text.
- Dialogs are modal: Tab stays inside, and focus returns to what opened them. Menus and popovers follow the WAI-ARIA patterns.
- **High contrast** (`prefers-contrast: more`): outlines on controls, cards and popups, and stronger dimmed text.
- **Forced colours** (Windows High Contrast): selection, switches, checks, progress and focus are drawn in system colours.
- **Reduced motion**: every animation is turned off.

## Design

- libadwaita values: `docs/reference/adwaita-1.10-web-reference.md`

Fonts: Adwaita Sans and Adwaita Mono (SIL Open Font License, see `static/fonts-LICENSE.txt`).
