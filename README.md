# cromenockle

A Wayland clipboard manager with a spotlight-style launcher window.

- One process. The clipboard watcher and the UI live in the same binary — no separate daemon to babysit.
- Launches hidden at login, pops up on a global hotkey, hides again after you pick something.
- Stores text and images in a local SQLite database, with images on disk under `XDG_DATA_HOME`.
- Built with Go + Wails v3 (alpha) + Solid.js + TailwindCSS v4.

> Currently targets Linux (GTK4 / WebKitGTK 6.0). Tested on **Fedora 44 / GNOME 47 Wayland**. macOS/Windows builds compile via `task build` but the install/autostart story below is Linux-only.

---

## Install

### Fedora / RHEL / Rocky / Alma (RPM)

```bash
sudo dnf install ./cromenockle-0.1.0-1.x86_64.rpm
```

The RPM installs:

| Path | Purpose |
|------|---------|
| `/usr/bin/cromenockle` | The binary |
| `/usr/share/applications/cromenockle.desktop` | App menu entry |
| `/etc/xdg/autostart/cromenockle.desktop` | System-wide autostart with `--hidden` |
| `/usr/share/icons/hicolor/128x128/apps/cromenockle.png` | Icon |

Runtime dependencies: `gtk4`, `webkitgtk6.0`. These are pulled in automatically by `dnf`.

### Other distros (AppImage)

```bash
chmod +x cromenockle-x86_64.AppImage
./cromenockle-x86_64.AppImage
```

The AppImage is self-contained — no installation, no root needed. For autostart, see [Autostart](#autostart) below.

### Debian / Ubuntu (DEB)

```bash
sudo apt install ./cromenockle_0.1.0_amd64.deb
```

Requires `libgtk-4-1` + `libwebkitgtk-6.0-4` (Ubuntu 24.04+ / Debian 13+).

### From source

You need:

- Go ≥ 1.24, with `CGO_ENABLED=1`
- Node ≥ 20
- [Task](https://taskfile.dev) (`go install github.com/go-task/task/v3/cmd/task@latest`)
- [Wails v3 CLI](https://v3.wails.io) (`go install -v github.com/wailsapp/wails/v3/cmd/wails3@latest`)
- GTK4 + WebKitGTK 6.0 headers — on Fedora: `sudo dnf install gtk4-devel webkitgtk6.0-devel`

Then:

```bash
git clone <repo> cromenockle
cd cromenockle
task build           # produces ./bin/cromenockle
task linux:package   # produces RPM + DEB + AppImage + Arch under ./bin
```

---

## Running

### How it starts

`cromenockle` is **single-instance**. The clipboard watcher runs inside the same process as the UI — keep the process alive, you have clipboard history. Kill it, you don't.

Two ways the process gets started:

1. **At login**, via `/etc/xdg/autostart/cromenockle.desktop`, with the `--hidden` flag. The window is created but not shown. The clipboard watcher starts immediately.
2. **On demand**, when you run `cromenockle` (from a launcher, a terminal, or — usually — a global hotkey). If a hidden instance is already running, this second invocation **toggles the window** in the running process and exits. If nothing is running, it starts a normal foreground instance.

### What the window does

- Opens centered, frameless, 720×480, on top of everything.
- `↑/↓/Enter` to pick. `Space` to copy when search is empty. Typing filters.
- `Esc` clears the search; pressed again with empty search, hides the window.
- Clicking outside the window hides it (focus-lost).
- After you copy an item, the window hides automatically (~620 ms later — enough to see the confirmation animation).

So the flow is: hotkey → window appears → arrow + Enter → window hides + the picked item is on your clipboard.

### Autostart

The RPM/DEB install autostart system-wide. If you installed from AppImage or `task build`, enable it per-user:

```bash
mkdir -p ~/.config/autostart
cp build/linux/autostart/cromenockle.desktop ~/.config/autostart/
# If using the AppImage, edit Exec= to point at the AppImage path.
```

To disable autostart without uninstalling, create an override that hides the entry:

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/cromenockle.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=Cromenockle (background)
Exec=cromenockle --hidden
Hidden=true
EOF
```

---

## Global hotkey

Wayland does not give clients global hotkeys — the compositor owns them. You bind a key to the `cromenockle` command in your desktop environment, and Wails' single-instance plumbing toggles the window from inside the running process.

### GNOME (Fedora default)

`Settings → Keyboard → Keyboard Shortcuts → View and Customize Shortcuts → Custom Shortcuts → +`

| Field | Value |
|-------|-------|
| Name | Cromenockle |
| Command | `cromenockle` |
| Shortcut | `Super+V` |

Or from the CLI:

```bash
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/cromenockle/']"

dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/cromenockle/name "'Cromenockle'"
dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/cromenockle/command "'cromenockle'"
dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/cromenockle/binding "'<Super>v'"
```

> **Heads up:** GNOME treats the Super key (alone) as "open Activities" on press-release. Combinations like `Super+V` work, but the Activities overlay may flash briefly if you hold Super too long. If that's annoying, swap for `<Ctrl><Alt>v` or `<Super><Shift>v`.

### KDE Plasma

`System Settings → Shortcuts → Custom Shortcuts → Edit → New → Global Shortcut → Command/URL`

Trigger: `Meta+V`. Action: `cromenockle`.

### Sway / Hyprland / niri

Add to your config:

```
# sway
bindsym $mod+v exec cromenockle

# hyprland
bind = SUPER, V, exec, cromenockle
```

### Verifying

With the watcher running (`pgrep cromenockle` returns something), `cromenockle` from a terminal should toggle the window. If it opens a *second* window instead, the single-instance lock failed — check `~/.config/cromenockle/` and `/tmp/` for stale lock files and report a bug.

---

## Data

| Path | Contents |
|------|----------|
| `${XDG_DATA_HOME:-~/.local/share}/cromenockle/items.db` | SQLite database of clipboard history |
| `${XDG_DATA_HOME:-~/.local/share}/cromenockle/images/` | PNG payloads for image clips |

There is no settings file yet. Everything is on disk under the XDG data dir; delete it to reset.

---

## Development

```bash
task dev                       # Wails dev loop: Vite + Go rebuild + bindings regen
cd frontend && npm run typecheck
cd frontend && npm run lint
golangci-lint run ./...
```

`task dev` regenerates `frontend/bindings/**` from Go service signatures whenever you change a method on `internal/service/service.go`. Never hand-edit `bindings/`.

The dev window does **not** auto-hide on copy (you'd lose your iteration loop) — the production hide-on-copy is gated by `import.meta.env.DEV` in `frontend/src/App.tsx`.

---

## Architecture in one paragraph

`main.go` boots Wails, wires a SQLite store (`internal/store`), a Wayland clipboard monitor (`internal/clipboard`), and a service (`internal/service`) that bridges them to the frontend. The monitor runs in a goroutine bound to the service context — alive for the lifetime of the process. The service exposes a handful of methods (`List`, `Copy`, `Delete`, `Clear`, `GetImage`) which Wails surfaces to Solid.js via auto-generated bindings. Global hotkeys are not handled here; they are delegated to the desktop environment, which re-launches the binary, and Wails' `SingleInstance` triggers `OnSecondInstanceLaunch` in the already-running process to toggle the window.

---

## License

MIT.
