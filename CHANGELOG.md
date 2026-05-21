# Changelog

All notable changes to copyd will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/andrelopes-code/copyd/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/andrelopes-code/copyd/releases/tag/v0.1.0
