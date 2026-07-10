#!/usr/bin/env bash
# Install design-artifact-loop for the Codex CLI.
#
# Codex has no plugin manifest system; it discovers skills from ~/.agents/skills/
# and MCP servers from ~/.codex/config.toml. This wires up both:
#   1. mirrors the skill (Codex needs a REAL directory with a REAL SKILL.md;
#      symlinked subdirectories are fine)
#   2. registers the MCP server via `codex mcp add`
#
# Runtime requirements are the same as for Claude Code: node >= 18 and chromium
# on PATH (or CHROMIUM_BIN). Idempotent — safe to re-run after `git pull`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SRC="$ROOT/skills/design-artifact-loop"
SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.agents/skills}"
DEST="$SKILLS_DIR/design-artifact-loop"

command -v codex >/dev/null || { echo "error: codex CLI not found on PATH" >&2; exit 1; }
command -v node  >/dev/null || { echo "error: node not found on PATH (runs the MCP server)" >&2; exit 1; }

# 1. Skill mirror
if [ -f "$DEST/.nanoclaw-managed" ]; then
  echo "skill: $DEST is managed by a NanoClaw install — leaving it alone"
else
  mkdir -p "$DEST"
  cp "$SKILL_SRC/SKILL.md" "$DEST/SKILL.md"
  ln -sfn "$SKILL_SRC/design-systems" "$DEST/design-systems"
  ln -sfn "$SKILL_SRC/fixtures" "$DEST/fixtures"
  echo "skill: mirrored to $DEST"
fi

# 2. MCP server (self-contained bundle — no npm install needed)
codex mcp add design-artifact-loop -- node "$ROOT/server/dist/index.mjs"
echo "mcp: design-artifact-loop registered — verify with: codex mcp list"
