<div align="center">

# qBittorrent Adwaita

**qBittorrent's Web UI, redesigned as a GNOME app.**

[![CI](https://github.com/jatinrai2911/qbittorrent-adwaita/actions/workflows/ci.yml/badge.svg)](https://github.com/jatinrai2911/qbittorrent-adwaita/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/jatinrai2911/qbittorrent-adwaita?color=3584e4)](https://github.com/jatinrai2911/qbittorrent-adwaita/releases/latest)
[![qBittorrent 5.2+](https://img.shields.io/badge/qBittorrent-5.2%2B-3584e4)](https://www.qbittorrent.org)
[![License: GPL v3+](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)

<img src="docs/screenshots/demo.gif" alt="A tour: browsing the list, opening a torrent's details and files, filtering by category, searching, the table view, adding a magnet link, switching to dark" width="100%">

**[Download](https://github.com/jatinrai2911/qbittorrent-adwaita/releases/latest)** · [Install in 3 steps](#install) · [User guide](docs/guide.md) · [Changelog](CHANGELOG.md)

</div>

<br>

## Your library, at a glance

Grouped by what needs you: problems first, then downloading, seeding, queued and stopped.

![The torrent list, grouped by state, in the dark theme](docs/screenshots/list-dark.png)

## Every detail, one click away

A resizable sheet with the piece map, files and priorities, trackers, peers and web seeds.

![The details sheet open on the Files tab, with episodes and priorities](docs/screenshots/details-files-dark.png)

## Built for big libraries

<table>
<tr>
<td width="50%"><img src="docs/screenshots/table-light.png" alt="The table view with sortable columns"><br><sub><b>A dense, sortable table</b>, virtualized for thousands of torrents.</sub></td>
<td width="50%"><img src="docs/screenshots/selection-dark.png" alt="Selection mode with the action bar"><br><sub><b>Selection mode</b> acts on many at once, with Undo.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/status-dark.png" alt="The status popover with a live speed graph"><br><sub><b>Live status</b>: speeds, limits, disk space, connection health.</sub></td>
<td width="50%"><img src="docs/screenshots/preferences-light.png" alt="Preferences, Speed page"><br><sub><b>Every setting</b>, searchable, applied as you change it.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/screenshots/list-light.png" alt="The torrent list in the light theme"><br><sub><b>Light and dark</b>, following your system.</sub></td>
<td width="50%"><img src="docs/screenshots/details-dark.png" alt="The details sheet: overview with the piece map"><br><sub><b>Overview</b> with the piece map, transfer and options.</sub></td>
</tr>
</table>

## And everything else

**Keyboard-first:** arrows, Space, Delete, F2, Enter, type-to-search ·
**Accessible:** WCAG AA in both themes, screen readers, high contrast, reduced motion ·
**Private:** passkeys masked, no third-party requests ·
**Add anything:** paste a magnet anywhere or drop `.torrent` files, with a file preview ·
**Complete:** filters, categories, tags, trackers, speed limits and scheduler, statistics, execution log,
torrent creator, cookies

## Install

1. **Download** the [latest release](https://github.com/jatinrai2911/qbittorrent-adwaita/releases/latest) zip and unzip it.
2. **In qBittorrent**, open *Tools → Options → Web UI*, tick **Use alternative WebUI**, and set
   **Files location** to the unzipped `qbittorrent-adwaita` folder.
3. **Open your Web UI** and log in.

The [user guide](docs/guide.md) covers headless and Docker setups, switching back, shortcuts and the
FAQ.

<br>

<div align="center">
<sub>
Free software under the <a href="LICENSE">GPL-3.0-or-later</a> · <a href="CONTRIBUTING.md">Contributing</a> · <a href="SECURITY.md">Security</a><br>
An independent project, not affiliated with qBittorrent or GNOME. The screenshots show a made-up
library of public-domain films, Linux ISOs and open archives.
</sub>
</div>
