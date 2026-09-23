# Contributing

Thanks for helping. Bug reports, small fixes and well-argued ideas are all welcome. For anything
larger, open an issue first so we can agree on the shape before you spend time on it.

## Setting up

You need Node.js 22 or newer.

```bash
npm install

# Without a qBittorrent: a pretend one with made-up torrents (any login works)
npm run mock
QBT_URL=http://127.0.0.1:9100 npm run dev

# Or against a real qBittorrent; the dev server proxies /api to it
QBT_URL=http://127.0.0.1:8080 npm run dev
```

The dev server rewrites `Origin` and `Referer` for qBittorrent's CSRF check, so you don't need to
change any qBittorrent settings to develop against it.

## Tests

| Command | What it runs |
|---|---|
| `npm test` | Unit and component tests (Vitest, jsdom, Testing Library) |
| `npm run check` | svelte-check; TypeScript errors *and* Svelte warnings fail it |
| `npm run e2e` | Builds, starts `qbittorrent-nox` 5.2 in Docker on `127.0.0.1:18080`, runs Playwright (Chromium) with axe accessibility scans, then removes the container. Needs Docker; run `npx playwright install chromium` once first. `E2E_KEEP=1` keeps the container running. |

End-to-end tests never touch your own qBittorrent. They create small local torrents inside the
throwaway container.

- **Fixes start with a failing test.** Write the test that shows the bug, watch it fail, then fix it.
- **Never point tests or scripts at a real library.** Reads are fine; writes are not.

## Project layout

```
src/
  api/          typed wrappers for qBittorrent's Web API
  sync/         the maindata poller, refreshers, merge logic
  state/        session, selection, filters, view settings
  features/     list, table, details, add, actions, preferences, tools, shell
  ui/adw/       the libadwaita-style component kit (buttons, rows, dialogs, popovers, motion)
tests/          unit and component tests, fixtures
e2e/            the Docker harness and Playwright specs
scripts/        mock server, screenshots, release packaging
docs/           user guide, libadwaita reference, screenshots
```

## Design rules

Reviews hold changes to these:

- **It should feel like a GNOME app.** Match libadwaita's metrics, colours and motion
  (`docs/reference/adwaita-1.10-web-reference.md`). Use the kit in `src/ui/adw`, not native
  `<select>`, date or time pickers. Popovers have no arrow. Animations go through `motion.ts`,
  which also handles reduced motion.
- **Built for big libraries.** Assume hundreds or thousands of torrents. Lists virtualize, and polling
  is incremental. A tick should update only the rows that changed.
- **Keyboard-first and accessible.**
  - Every action is reachable from the keyboard.
  - Text meets WCAG AA contrast in light, dark and high contrast.
  - Dialogs are modal (focus is trapped and returns to whatever opened them).
  - Screen readers get real roles, names and live updates.
- **Private trackers are first-class.**
  - Passkeys never reach toasts, titles or logs; mask them with `maskTrackerUrl` and `maskSecrets`.
  - Destructive and lock-out-prone actions ask first.
- **The server is the source of truth.** Optimistic updates are fine if they roll back on failure and
  offer *Undo* where it makes sense.

## Commits and pull requests

- [Conventional Commits](https://www.conventionalcommits.org): `fix(details): …`, `feat(add): …`,
  `test: …`, `docs: …`. Keep commits small; each one should build and pass the tests.
- Fill in the pull request checklist. Mention anything you couldn't test, and include before/after
  screenshots for visual changes, in both light and dark.
- If you change a shortcut, update `src/features/shell/shortcuts.ts` and the table in `docs/guide.md` together.
  A test checks that they match.

## Screenshots

`npm run screenshots` retakes everything in `docs/screenshots/` from the mock server, so the
pictures never show anyone's real library.

## Releasing (maintainers)

1. Update `CHANGELOG.md`, and set the version in `package.json` (`npm version <x.y.z> --no-git-tag-version`).
2. Commit, then tag `v<x.y.z>` and push the tag.
3. The *Release* workflow tests, builds `release/qbittorrent-adwaita-<x.y.z>.zip` (`npm run package`
   locally does the same) and attaches it to a GitHub release.

## License

By contributing you agree that your work is released under the
[GNU General Public License v3.0 or later](LICENSE), like the rest of the project.
