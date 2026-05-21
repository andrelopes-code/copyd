# Contributing to copyd

Solo project. For anything beyond a one-line fix, open an issue first — I'd rather have you spend 10 minutes asking than 2 hours building the wrong thing.

## Prerequisites

- Go ≥ 1.25, with `CGO_ENABLED=1`
- Node ≥ 20
- [Task](https://taskfile.dev): `go install github.com/go-task/task/v3/cmd/task@latest`
- [Wails v3 CLI](https://v3.wails.io): `go install -v github.com/wailsapp/wails/v3/cmd/wails3@latest`
- GTK4 + WebKitGTK 6.0 development headers
  - Fedora: `sudo dnf install gtk4-devel webkitgtk6.0-devel`
  - Ubuntu 24.04+: `sudo apt install libgtk-4-dev libwebkitgtk-6.0-dev`

## Development loop

```bash
task dev
```

Wails watches Go files, runs Vite, regenerates `frontend/bindings/**` whenever a service signature changes. Never hand-edit the bindings.

## Before opening a PR

```bash
cd frontend && npm run typecheck
cd frontend && npm run lint
golangci-lint run
task build
```

All four must pass.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org), English, lowercase scopes. Scopes used so far: `ui`, `backend`, `build`, `ci`, `docs`. Examples:

- `feat(ui): add Quick Look preview`
- `fix(backend): tighten content detection`
- `ci: pin Go version in release workflow`

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).
