# Security

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through
[GitHub security advisories](https://github.com/jatinrai2911/qbittorrent-adwaita/security/advisories/new) instead.

Include what you found, how to reproduce it, and which versions are affected (the Web UI version from
*About qBittorrent*, and qBittorrent's own). You'll get an answer within a week. A fix is released as
soon as it's ready, and you're credited unless you'd rather not be.

## Supported versions

Only the latest release gets security fixes.

## What the Web UI does with your data

- **It talks only to the qBittorrent that serves it**, through qBittorrent's own Web API and its
  session login. It makes no other network requests: no analytics, no CDNs, no remote fonts. The two
  links in *About* (qBittorrent's site and source code) open only when you click them.
- **It stores only its own view settings** (list or table, sort order, columns, sheet height), in
  qBittorrent's `clientdata` and cached in the browser's local storage. It never stores your
  password. The login form hands it straight to qBittorrent.
- **Tracker passkeys stay off the screen.** Tracker URLs, private download links and tracker
  messages that echo a passkey are masked wherever they're shown, and never appear in notifications,
  tooltips or window titles. *Copy* and *Edit* still use the full value.
- **Cookie values** are masked until you choose to reveal them, and the **API key** is shown masked
  (copy it with its button).
- **Dangerous settings ask first.** Changing the Web UI address, port, HTTPS, credentials or this
  alternative UI asks for confirmation and says what will happen.

## Running it safely

The Web UI has the same reach as qBittorrent's Web UI, because it *is* qBittorrent's Web UI: anyone
who can log in can manage your torrents. Use a strong password, prefer HTTPS (or a reverse proxy that
provides it) when you reach it over a network, and keep qBittorrent itself up to date.
