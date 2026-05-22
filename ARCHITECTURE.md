# Architecture

`main.go` boots Wails, wires a SQLite store (`internal/store`), a Wayland clipboard monitor (`internal/clipboard`), and a service (`internal/service`) that bridges them to the frontend. The monitor runs in a goroutine bound to the service context — alive for the lifetime of the process. The service exposes a handful of methods (`List`, `Copy`, `Pin`, `Unpin`, `Delete`, `Clear`, `GetImage`) which Wails surfaces to Solid.js via auto-generated bindings under `frontend/bindings/`. Global hotkeys are delegated to the desktop environment, which re-launches the binary; Wails' `SingleInstance` then triggers `OnSecondInstanceLaunch` in the already-running process to toggle the window.

## Package layout

| Package | Responsibility |
|---------|---------------|
| `main` | Wails boot, window construction, single-instance plumbing, version flag. |
| `internal/store` | SQLite persistence (pure-Go `modernc.org/sqlite`). Schema lives here. |
| `internal/clipboard` | Clipboard watcher goroutine. Default Linux backend is GTK4 `GdkClipboard` via cgo — reactive (driven by the `changed` signal), runs inside the same GTK connection Wails has already initialised, no extra Wayland clients. Falls back to libxcb-backed `golang.design/x/clipboard` on X11 sessions when the Wails app handle is unavailable. Emits new items to the service; writes go through the same in-process API. |
| `internal/item` | Domain model (`Item`, content kinds, timestamps). |
| `internal/service` | Wails-exposed service. Methods here become the frontend API surface. |

## Data on disk

| Path | Contents |
|------|----------|
| `${XDG_DATA_HOME:-~/.local/share}/copyd/items.db` | Clipboard history (SQLite) |
| `${XDG_DATA_HOME:-~/.local/share}/copyd/images/` | PNG payloads for image clips |

Resolved via `github.com/adrg/xdg` — no hardcoded paths.

## Frontend

Solid.js SPA under `frontend/src/`. Components are thin; state lives in `lib/` (clipboard store). Wails bindings under `frontend/bindings/` are auto-generated — change the Go service to change the API.

## Why no daemon

The clipboard watcher and the UI run in the same process. One binary, one process, one place to look when something is wrong. The cost is that killing the process drops the history's live tail (the SQLite store on disk remains).
