#!/usr/bin/env bash
# Report what changed on the other side and how it relates to your work. Never merges anything.
#   scripts/sync.sh               preview: what merging origin/dev into this branch would bring in
#   scripts/sync.sh --after-pull  what the last pull or merge just brought in (run by the post-merge hook)
# Writes SYNC_REPORT.md (git-ignored) and prints it.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

mode=preview
[[ "${1:-}" == "--after-pull" ]] && mode=after

area() {
  case "$1" in
    shared/*|web/src/lib/types.ts) echo "CONTRACT (both: tell the other person)" ;;
    web/public/data/*) echo "GENERATED DATA (Prathik's pipeline writes it)" ;;
    pipeline/*) echo "PIPELINE (Prathik)" ;;
    web/*) echo "DASHBOARD (Noel)" ;;
    data/*|docs/*) echo "READ-ONLY INPUT" ;;
    HANDOFF.md|CLAUDE.md|scripts/*|.githooks/*|.claude/*|.gitignore) echo "TEAM SETUP" ;;
    *) echo "OTHER" ;;
  esac
}

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ $mode == after ]]; then
  range="ORIG_HEAD..HEAD"
  diffrange="$range"
  title="What the last pull or merge brought into \`$branch\`"
  local_changes=""
else
  git fetch origin --prune --quiet
  base=origin/dev
  git rev-parse --verify --quiet "$base" >/dev/null || base=origin/main
  range="HEAD..$base"
  diffrange="HEAD...$base" # three dots: only what the other side changed since we diverged
  title="What merging \`$base\` into \`$branch\` would bring in (nothing merged yet)"
  local_changes=$(git diff --no-renames --name-only "$(git merge-base HEAD "$base")" HEAD | sort -u)
fi

incoming=$(git diff --no-renames --name-status "$diffrange" || true)
report=SYNC_REPORT.md

{
  echo "# Sync report"
  echo
  echo "$title. Generated $(date '+%Y-%m-%d %H:%M')."
  echo
  if [[ -z "$incoming" ]]; then
    echo "Nothing incoming: you are up to date."
  else
    echo "## Commits"
    git log --no-merges --format='- `%h` %an: %s' "$range"
    echo
    echo "## Files changed, by who owns the area"
    while IFS=$'\t' read -r status path; do
      printf -- '- `%s` %s: %s\n' "$status" "$path" "$(area "$path")"
    done <<<"$incoming"
    echo
    echo '```'
    git diff --no-renames --stat "$diffrange"
    echo '```'
    echo
    echo "## Check before you keep it"
    paths=$(cut -f2 <<<"$incoming")
    flagged=0
    if grep -qE '^(shared/|web/src/lib/types.ts)' <<<"$paths"; then
      echo "- **Contract changed** (shared/schema.md or types.ts): make sure both sides still agree. Look at: \`git diff $diffrange -- shared web/src/lib/types.ts\`"
      flagged=1
    fi
    if grep -q '^web/public/data/' <<<"$paths"; then
      echo "- **Generated data changed**: reload the dashboard. If you edit the pipeline, re-run \`cd pipeline && uv run pipeline next-rupee\` and commit the new JSON."
      flagged=1
    fi
    if grep -q '^pipeline/pyproject.toml\|^web/package.json' <<<"$paths"; then
      echo "- **Dependencies changed**: run \`cd pipeline && uv sync\` and/or \`cd web && npm install\`."
      flagged=1
    fi
    if [[ -n "$local_changes" ]]; then
      overlap=$(comm -12 <(sort -u <<<"$paths") <(sort -u <<<"$local_changes") || true)
      if [[ -n "$overlap" ]]; then
        echo "- **Overlap: both sides changed these files (merge conflict risk)**:"
        sed 's/^/  - `/; s/$/`/' <<<"$overlap"
        flagged=1
      fi
    fi
    [[ $flagged -eq 0 ]] && echo "- Nothing risky: no contract, data, dependency or overlapping-file changes."
    echo
    handoff=$(git diff --no-renames "$diffrange" -- HANDOFF.md | grep -E '^\+' | grep -vE '^\+\+\+' | sed 's/^+//' || true)
    if [[ -n "$handoff" ]]; then
      echo "## New HANDOFF.md notes (the author's own context)"
      echo
      echo "$handoff"
      echo
    fi
    echo "## Keep or discard"
    if [[ $mode == after ]]; then
      echo "- Keep everything: do nothing."
      echo "- Discard one file's incoming change (restore your version, then commit): \`git checkout ORIG_HEAD -- <file> && git commit -m \"Keep my version of <file>\"\`"
      echo "- Undo the whole merge: \`git reset --hard ORIG_HEAD\` (only if you have no uncommitted work)."
    else
      echo "- Keep everything: \`git merge $base\`"
      echo "- Pick what to keep: \`git merge --no-commit --no-ff $base\`, then for each file you do not want run \`git checkout HEAD -- <file>\`, then \`git commit\`. Cancel with \`git merge --abort\`."
      echo "- Read one file's change first: \`git diff HEAD...$base -- <file>\`"
    fi
  fi
} >"$report"

cat "$report"
