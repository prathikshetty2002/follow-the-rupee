#!/usr/bin/env bash
# One-time setup per clone: turns on the post-merge sync report and uses merges, not rebases, when pulling.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
chmod +x scripts/*.sh .githooks/*
git config core.hooksPath .githooks
git config pull.rebase false
echo "Done. After every pull or merge, read SYNC_REPORT.md. Preview before merging: scripts/sync.sh"
