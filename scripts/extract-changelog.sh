#!/usr/bin/env bash
# Extracts the section for a given version from CHANGELOG.md and prints it.
# Usage: ./scripts/extract-changelog.sh 0.1.0
set -euo pipefail

if [[ -z "${1:-}" ]]; then
    echo "usage: $0 <version>" >&2
    exit 2
fi

version="$1"
changelog="${CHANGELOG:-CHANGELOG.md}"

if [[ ! -f "$changelog" ]]; then
    echo "$changelog not found" >&2
    exit 1
fi

awk -v ver="$version" '
    $0 ~ "^## \\[" ver "\\]"      { in_section = 1; next }
    in_section && /^## \[/        { exit }
    in_section && /^\[[^]]+\]:/   { exit }
    in_section                    { print }
' "$changelog"
