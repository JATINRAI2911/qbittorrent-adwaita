# qBittorrent Adwaita WebUI

An alternative WebUI for qBittorrent 5.2+ that looks and behaves like a GNOME (GTK4/libadwaita) app.

## Use it

1. `npm ci && npm run build`. This produces `dist/public/index.html`.
2. In qBittorrent: **Tools → Options → Web UI**. Enable the Web UI, tick **Use alternative WebUI**, and set the files location to this repository's **`dist`** folder (the folder that *contains* `public/`).
3. Open the Web UI address (for example `http://127.0.0.1:9000`) and log in.

If `dist/public/index.html` is missing, qBittorrent turns the alternative UI off by itself.

## Develop

```bash
npm install
QBT_URL=http://127.0.0.1:9000 npm run dev   # proxies /api to qBittorrent, rewriting Origin/Referer for its CSRF check
npm test                                     # unit + component tests
npm run check                                # svelte-check (TypeScript)
```

To test against a snapshot of your own library, which is never committed:

```bash
QBT_USER=admin QBT_PASS=… node scripts/record-maindata.mjs
npm test   # tests/unit/maindata-real.test.ts now runs against it
```

## Design

- libadwaita values: `docs/reference/adwaita-1.10-web-reference.md`

Fonts: Adwaita Sans and Adwaita Mono (SIL Open Font License, see `static/fonts-LICENSE.txt`).
