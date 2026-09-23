# User guide

Everything beyond the three-step install in the [README](../README.md).

## Install

You need qBittorrent 5.2 or newer with its Web UI turned on (*Tools → Options → Web UI*). Download
`qbittorrent-adwaita-<version>.zip` from the [latest release](https://github.com/jatinrai2911/qbittorrent-adwaita/releases/latest)
and unzip it somewhere qBittorrent can read:

```
qbittorrent-adwaita/
├── public/          ← the Web UI
├── LICENSE
└── README.md
```

In *Tools → Options → Web UI*, tick **Use alternative WebUI** and set **Files location** to the
`qbittorrent-adwaita` folder: the one that *contains* `public/`, not `public/` itself.

### Headless (`qbittorrent-nox`)

Stop qBittorrent, then add these to `qBittorrent.conf` under `[Preferences]`:

```ini
WebUI\AlternativeUIEnabled=true
WebUI\RootFolder=/path/to/qbittorrent-adwaita
```

### Docker

Mount the unzipped folder into the container and use the path inside it:

```yaml
services:
  qbittorrent:
    image: qbittorrentofficial/qbittorrent-nox:latest
    volumes:
      - ./config:/config
      - ./downloads:/downloads
      - ./qbittorrent-adwaita:/webui:ro   # the unzipped release
```

Then set *Files location* to `/webui` in the Web UI options, or `WebUI\RootFolder=/webui` in the config.

### Updating

Replace the folder with the new release and reload the page. Your view settings are kept: they live
in qBittorrent.

### Switching back

Any of these brings back qBittorrent's built-in Web UI:

- In this UI: **Preferences → Web UI →** turn off *Use an alternative Web UI*.
- In qBittorrent's window: *Tools → Options → Web UI →* untick *Use alternative WebUI*.
- Headless: set `WebUI\AlternativeUIEnabled=false` in `qBittorrent.conf`.
- If you're locked out: rename `public/index.html` in the folder. qBittorrent then falls back to its
  own UI.

## Build from source

```bash
git clone https://github.com/jatinrai2911/qbittorrent-adwaita.git
cd qbittorrent-adwaita
npm ci
npm run build      # → dist/, which contains public/; point qBittorrent at dist
npm run package    # or: the same zip as a release, in release/
```

You need Node.js 22 or newer. For development, tests and the mock server, see
[CONTRIBUTING.md](../CONTRIBUTING.md).

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

Browsers usually keep Ctrl/Cmd + 1 / 2 for switching tabs, hence Alt + 1 / 2. The full list is also
in the app: *Main menu → Keyboard Shortcuts*.

## Design and accessibility

The interface follows GNOME's [Human Interface Guidelines](https://developer.gnome.org/hig/) and
libadwaita's look: its colours, spacing, typography (Adwaita Sans and Mono, bundled) and motion. It
follows your system's light or dark preference.

Accessibility is part of the definition of done:
- **Contrast:** every screen is checked with axe against WCAG 2.1 AA, in both themes.
- **Dialogs** are modal: focus stays inside and returns to what opened them.
- **Keyboard focus** is real DOM focus, so screen readers follow it; roles, names and live
  announcements are throughout.
- **High contrast and forced colours** (Windows High Contrast) are supported, and **reduced motion**
  turns every animation off.

## Compatibility

| | Supported |
|---|---|
| qBittorrent | 5.2 or newer (Web API 2.15+), libtorrent 1.2 or 2.0 |
| Browsers | Firefox 128+, Chrome / Edge 119+, Safari 18+ (it relies on modern CSS such as relative colours and `:has()`) |
| Screens | Desktop and laptop. It's usable on a tablet, but phones aren't a target. |

The end-to-end suite runs against qBittorrent 5.2 in Chromium.

## FAQ

<details>
<summary><b>I see a blank page, or qBittorrent's own UI</b></summary>

Check that *Files location* points at the folder that **contains** `public/`, and that
`public/index.html` exists. qBittorrent turns the alternative UI off by itself when that file is
missing. It also refuses symbolic links inside the folder, so copy the files rather than linking
them.
</details>

<details>
<summary><b>Does it work behind a reverse proxy?</b></summary>

Yes, at the root or under a sub-path such as `https://example.com/qbittorrent/`. Every request is
relative to the page. Use a path that ends in `/`; most proxies redirect to one for you. Changing
the Web UI address or port from Preferences warns you that the proxy may need updating too.
</details>

<details>
<summary><b>What about RSS and search plugins?</b></summary>

They aren't in 1.0. The list, details, adding, every other preference and the tools are. RSS and
search are planned. Until then, use qBittorrent's built-in UI or desktop app for them.
</details>

<details>
<summary><b>Will it mess with my torrents or settings?</b></summary>

No more than any Web UI: it only does what you ask it to. Destructive actions (delete, delete with
files, quit) and settings that could lock you out ask first. It stores nothing but its own view
settings.
</details>

## Privacy

The Web UI talks only to the qBittorrent that serves it: no analytics, no CDNs, no remote fonts.
Tracker passkeys are masked wherever they're shown. The only thing it stores is its own view
settings, in qBittorrent. See [SECURITY.md](../SECURITY.md).
