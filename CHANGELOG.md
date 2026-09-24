# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0]

The first public release: a complete alternative Web UI for qBittorrent 5.2+, in the style of
GNOME's libadwaita.

### Library
- A grouped list: Needs Attention, Downloading, Seeding, Queued, Stopped. Each row shows live
  progress, speeds, ETA, category and tags; groups collapse and page through large sets.
- A table view with sortable, choosable columns, virtualized for thousands of torrents.
- Filters for status, category, tag and tracker (with counts), plus instant search; type anywhere
  to start searching.
- Selection mode with an action bar. Click, Shift-click and Ctrl-click select like a file manager.
- A phone layout for the list: a compact header, full-width filters, and rows that stack their details.
- Every torrent action:
  - start, stop, force start, recheck, reannounce, queue order;
  - move, rename;
  - category and tags;
  - speed and share limits;
  - sequential download, first and last pieces, automatic management, super seeding;
  - copy the name, hash or magnet; export the `.torrent`;
  - delete, with or without files.

  Undo is offered where it makes sense.

### Details
- A resizable bottom sheet for the focused torrent:
  - **Overview:** piece map, transfer, location, options, limits, information.
  - **Files:** tree, priorities, rename, folder collapse, filter; virtualized for very large torrents.
  - **Trackers:** status, counts and messages, with passkeys masked; add, edit, remove.
  - **Peers:** flags, client, connection, relevance; add, copy, ban.
  - **HTTP sources.**

### Adding
- Add from `.torrent` files, magnet links and URLs: paste anywhere, drop onto the window, or use
  the Add dialog.
- A preview with the file tree and per-file choices, duplicate detection, and every add option
  qBittorrent offers. The options start from your qBittorrent defaults.

### Status and health
- Banners for a lost connection, no network, blocked incoming connections and low disk space, each
  with the action that fixes it.
- A status popover with a live speed graph, the free space and session totals.
- The alternative speed limits toggle, a Speed Limits dialog with a scheduler, and Statistics.

### Preferences
- Every qBittorrent setting except RSS (which comes with RSS support), on seven pages. Changes
  apply as you make them, and search covers every page.
- Changes that could lock you out (address, port, HTTPS, credentials, the alternative UI) ask first
  and say what will happen.
- Dialogs for the API key, watched folders, the network interface, and tracker and IP lists.

### Tools
- Execution Log (messages and peers), with level filter, search and copy; it stays smooth at
  20,000 lines.
- Torrent Creator, with tracker tiers, web seeds, piece size, and libtorrent 1 or 2 options.
- Cookies, About, Keyboard Shortcuts, and Quit qBittorrent.

### Keyboard
- Arrow keys move between torrents, and Shift+arrows extend the selection.
- Space starts or stops, Delete deletes, F2 renames, Enter opens details.
- Ctrl/Cmd+F searches, Ctrl/Cmd+O adds, Ctrl/Cmd+, opens Preferences, Ctrl/Cmd+? lists the
  shortcuts, and Alt+1/2 switch views.

### Accessibility
- WCAG 2.1 AA contrast in light and dark, checked by automated axe scans.
- Modal dialogs: focus is trapped and returns to whatever opened them.
- Real DOM focus on rows, ARIA roles and states throughout, and polite live announcements.
- High contrast (`prefers-contrast: more`), forced colours (Windows High Contrast) and reduced
  motion.

### Deployment
- A drop-in alternative Web UI folder: no server-side component.
- Works behind reverse proxies, at the root or under a sub-path.
- Release zips have the layout qBittorrent expects.

### Privacy
- No requests beyond the qBittorrent that serves the page; fonts are bundled.
- Tracker passkeys are masked wherever they're shown.
- Only view settings are stored: in qBittorrent's `clientdata`, cached in local storage.

[1.0.0]: https://github.com/jatinrai2911/qbittorrent-adwaita/releases/tag/v1.0.0
