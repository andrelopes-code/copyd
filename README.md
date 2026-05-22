# copyd

> Wayland clipboard manager with a spotlight-style launcher.

[![release](https://img.shields.io/github/v/release/andrelopes-code/copyd?sort=semver)](https://github.com/andrelopes-code/copyd/releases)
[![ci](https://github.com/andrelopes-code/copyd/actions/workflows/ci.yml/badge.svg)](https://github.com/andrelopes-code/copyd/actions/workflows/ci.yml)
[![license](https://img.shields.io/github/license/andrelopes-code/copyd)](./LICENSE)

One process. The clipboard watcher and the launcher window live in the same binary — no daemon to babysit. Launches hidden at login, pops up on a global hotkey, hides again after you pick something.

> Linux only. Built and tested on Fedora 44 / GNOME 47 Wayland. macOS and Windows builds compile but autostart and packaging are not supported in this release.

## Install

Pick the artifact that matches your distro from the [latest release](https://github.com/andrelopes-code/copyd/releases/latest).

### Fedora / RHEL / Rocky / Alma

```bash
sudo dnf install ./copyd-0.1.0-1.x86_64.rpm
```

### Debian / Ubuntu (24.04+ / Debian 13+)

```bash
sudo apt install ./copyd_0.1.0_amd64.deb
```

### Any distro (AppImage)

```bash
chmod +x copyd-*.AppImage
./copyd-*.AppImage
```

### tar.gz (manual install)

```bash
tar -xzf copyd-0.1.0-linux-amd64.tar.gz
sudo install -m 0755 copyd /usr/local/bin/copyd
```

Verify any install:

```bash
copyd --version
```

### Runtime dependencies

GTK4 + WebKitGTK 6.0 for the window and the clipboard. The RPM/DEB pull these in automatically. For AppImage / tar.gz on Fedora: `sudo dnf install gtk4 webkitgtk6.0`. On Ubuntu 24.04+: `sudo apt install libgtk-4-1 libwebkitgtk-6.0-4`.

> The clipboard backend talks to GTK4's `GdkClipboard` in-process via cgo — same connection the window uses. Capture is reactive (driven by the GTK `changed` signal, not polling), and no extra Wayland clients are ever created, so the compositor sees a single stable copyd entry and the dock stays quiet. On an X11 session the libxcb-backed `golang.design/x/clipboard` is the fallback.

## Usage

`copyd` is **single-instance**. The clipboard watcher runs inside the same process as the UI.

Two ways the process gets started:

1. **At login** — `/etc/xdg/autostart/copyd.desktop` runs `copyd --hidden`. The window is created hidden; the clipboard watcher starts immediately.
2. **On demand** — running `copyd` again (from a hotkey, terminal, or launcher) toggles the window in the already-running process.

Inside the window:

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move selection |
| `Enter` | Copy selected item and hide |
| `Space` | Copy selected item (only when search is empty) |
| Type | Filter |
| `Esc` | Clear search; if already empty, hide |
| Click outside | Hide |

After copy, the window auto-hides ~620 ms later (enough to see the confirmation animation).

## Global hotkey

Wayland doesn't give clients global hotkeys — the compositor owns them. You bind a key to the `copyd` command in your desktop environment; Wails' single-instance plumbing toggles the window from inside the running process.

### GNOME

`Settings → Keyboard → Keyboard Shortcuts → Custom Shortcuts → +`

| Field | Value |
|-------|-------|
| Name | copyd |
| Command | `copyd` |
| Shortcut | `Super+V` |

Or via CLI:

```bash
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
  "['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyd/']"

dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyd/name "'copyd'"
dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyd/command "'copyd'"
dconf write /org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/copyd/binding "'<Super>v'"
```

> GNOME treats Super alone as "open Activities" on press-release. `Super+V` works but the overlay may flash if you hold Super. Swap to `<Ctrl><Alt>v` if that bothers you.

### KDE Plasma

`System Settings → Shortcuts → Custom Shortcuts → Edit → New → Global Shortcut → Command/URL`. Trigger: `Meta+V`. Action: `copyd`.

### Sway / Hyprland / niri

```
# sway
bindsym $mod+v exec copyd

# hyprland
bind = SUPER, V, exec, copyd
```

## Configuration

There is no settings file yet. Everything is on disk under the XDG data dir:

| Path | Contents |
|------|----------|
| `${XDG_DATA_HOME:-~/.local/share}/copyd/items.db` | SQLite history |
| `${XDG_DATA_HOME:-~/.local/share}/copyd/images/` | PNG payloads for image clips |

Delete the directory to reset everything.

### Disable autostart without uninstalling

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/copyd.desktop <<'EOF'
[Desktop Entry]
Type=Application
Name=copyd (background)
Exec=copyd --hidden
Hidden=true
EOF
```

## Build from source

You need:

- Go ≥ 1.25, with `CGO_ENABLED=1`
- Node ≥ 20
- [Task](https://taskfile.dev) — `go install github.com/go-task/task/v3/cmd/task@latest`
- [Wails v3 CLI](https://v3.wails.io) — `go install -v github.com/wailsapp/wails/v3/cmd/wails3@latest`
- GTK4 + WebKitGTK 6.0 headers (Fedora: `gtk4-devel webkitgtk6.0-devel`; Ubuntu 24.04+: `libgtk-4-dev libwebkitgtk-6.0-dev`)

```bash
git clone https://github.com/andrelopes-code/copyd.git
cd copyd
task build            # produces ./bin/copyd
task linux:package    # produces RPM + DEB + AppImage in ./bin
```

For the dev loop with auto-reload, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

## License

[MIT](./LICENSE).
