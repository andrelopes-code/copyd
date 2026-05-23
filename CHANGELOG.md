# Changelog

All notable changes to copyd will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-05-23

### Changed
- Copying an item now dismisses the window immediately. The previous ~620ms row animation that gated the hide is gone, so the launcher gets out of the way the instant you pick an item — the clipboard is still written while the window holds focus, as Wayland requires.

### Fixed
- The search input is now focused every time the window appears, not just on first launch. `autofocus` only fires on the initial render, so re-showing the window via the global shortcut (or after `--hidden` autostart) previously left the input unfocused; the window now emits a `window:shown` event that re-focuses the field.

## [0.2.0] - 2026-05-23

### Added
- Halo-well empty state with two variants — the initial "no items captured yet" view and a "no match" view that echoes the query back as a mono chip.
- Use-count chip on each row (`N×`) when an item has been re-copied, so recurring clips are recognisable at a glance.
- Per-type icon tints — URL (cyan), command (green), JSON (amber), email (violet), path (indigo), multiline (lilac). Quiet at rest, brighter when the row is selected.

### Changed
- Chrome redesign: recessed-slot search input with indigo focus glow, gradient row rail and accent wash on the selected item, section headers with status dot and trailing fade line, dual radial wells in the window corners for atmosphere.
- Multiline previews now stitch every non-blank line with a `↵` glyph (capped at 200 runes) instead of dropping all but the first line.
- Copy snaps the list scroll back to the top so the just-copied item is visible the next time the window opens.

### Fixed
- Copying an image back to the clipboard no longer freezes the app. The `"changed"` signal fired by our own write was deadlocking the GTK main thread on the round-trip through our content provider; self-writes now skip the readback entirely, and image content is published via the canonical `GdkTexture` API.
- Wayland clipboard capture is driven by an in-process `GdkClipboard` listener — no more `wl-paste` subprocess flickering the dock.
- Release pipeline no longer races `go mod tidy` against `npm install` walking `frontend/node_modules`; `install:frontend:deps` is now a hard prerequisite of the tidy step.
- `release.yml` accepts a `workflow_dispatch` trigger for dry-run validation against `main` without committing to a tag.

## [0.1.0] - 2026-05-21

First public release. Rebranded from the internal `cromenockle` prototype.

### Added
- Wayland clipboard monitor (text + images) with SQLite history under `${XDG_DATA_HOME}/copyd/`.
- Frameless 720×480 spotlight-style launcher window.
- Keyboard-first navigation: arrows + Enter to copy, typing filters, `Esc` clears then hides, `Space` copies when search is empty.
- Single-instance design: re-launching the binary toggles the window via Wails' `SingleInstance` callback. Lets the desktop environment own the global hotkey.
- `--hidden` flag for autostart at login.
- Quick Look preview pane with inline image thumbnails.
- Pin / unpin items to keep them at the top of the history.
- Linux packaging: RPM, DEB, AppImage, plain tar.gz.
- `--version` flag.

### Known limitations
- Linux-only (GTK4 / WebKitGTK 6.0). macOS and Windows compile but the install/autostart story is unsupported.
- No settings file yet; everything lives under `${XDG_DATA_HOME}/copyd/`.
- Built on Wails v3 alpha — minor breakage between Wails alphas is possible.

[Unreleased]: https://github.com/andrelopes-code/copyd/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/andrelopes-code/copyd/releases/tag/v0.2.0
[0.1.0]: https://github.com/andrelopes-code/copyd/releases/tag/v0.1.0
