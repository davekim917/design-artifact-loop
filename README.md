# design-artifact-loop

Render-grounded, non-slop UI design artifacts for coding agents.

"Design slop" is what you get when a model has no *committed* design system — it falls
back to the statistical average of web UIs: generic gradient hero, three equal cards,
default indigo, Inter everywhere. This plugin fixes that with **author-then-conform**:

1. **Commit a concrete design system before any markup** — pick one of ~18 vendored
   token systems (or author a fresh one) and reference every colour/size via `var(--…)`.
2. **Write a single self-contained static HTML artifact** — no JS, no external
   network beyond a declared font CDN.
3. **Iterate against real evidence, not self-assessment** — the `design_review` MCP
   tool re-renders the artifact headlessly (1440×900 + 390×844), runs a deterministic
   linter (token-trace, no-JS, network lockdown, font denylist, blank/overflow
   detection), and folds in findings from an **independent vision critic** that reads
   the rendered PNG. A disk-backed state machine carries findings forward across
   rounds and hard-caps the loop at 6 rounds — a clean lint alone never ships; the
   critic must have reviewed the exact artifact version (enforced via a content-hash
   review token).

## Components

- `skills/design-artifact-loop/` — the skill: the loop protocol (`SKILL.md`), ~18
  vendored design systems (`DESIGN.md` + `tokens.css` each; Apache-2.0, see
  `design-systems/ATTRIBUTION.md`), and good/slop fixture pairs.
- `server/` — the `design-review` MCP server (stdio): linter, renderer, and the
  round/cap state machine. 100+ tests.

## Requirements

- Node.js ≥ 18 — runs the MCP server (a committed self-contained bundle,
  `server/dist/index.mjs`; no install step). [Bun](https://bun.sh) is only needed for
  development (tests + rebuilding the bundle).
- Chromium on `PATH` (or set `CHROMIUM_BIN`) — used for headless rendering. Egress
  during render is blocked at the browser layer via `--host-resolver-rules` (only the
  declared font CDN resolves), so the artifact under review cannot phone home even if
  the linter misses a construct.

> **Snap chromium note (Ubuntu):** snap confinement denies chromium access to
> top-level dot-directories under `$HOME` (e.g. `~/.cache/...`), which surfaces as
> `render-blank` findings with 0-byte screenshots. Project-nested paths like
> `~/myproject/.design-artifact-loop/` work fine; if your loop root must live under a
> top-level dot-dir, point `CHROMIUM_BIN` at a non-snap chromium.

## Install (Claude Code)

```bash
claude plugin marketplace add davekim917/design-artifact-loop
claude plugin install design-artifact-loop@design-artifact-loop
```

The skill triggers on "design a …", "mock up a …", "make me a UI". Artifacts and
review state live under `.design-artifact-loop/<id>/` in your working directory
(override with `DESIGN_ARTIFACT_LOOP_ROOT`).

## Development

```bash
bun install
bun test server/      # linter, state machine, render classification, corpus integrity
bunx tsc --noEmit     # typecheck
bun run build         # rebuild server/dist/index.mjs after editing server/*.ts (commit it)
```

## Design notes

- **The linter is advisory; the render sandbox is the boundary.** Regex checks give
  fast feedback and keep the *delivered* artifact clean, but egress enforcement lives
  in the chromium invocation's DNS allowlist — so the linter doesn't have to chase
  every fetch-bearing HTML construct.
- **Critic findings can't be faked away.** Findings are tied to a content hash of the
  artifact version the critic actually reviewed; stale findings are dropped, absent
  critic findings stay open until a fresh critic pass clears them, and a clean
  artifact cannot ship until the critic has reviewed that exact version.
- **State is disk-atomic** (write-temp-then-rename under an advisory lock), so
  overlapping calls on the same run id cannot corrupt the trace.

Extracted from [NanoClaw](https://github.com/qwibitai/nanoclaw), where it ships as a
container skill for Claude/Codex/OpenCode agents.

## License

MIT (see `LICENSE`). The vendored design-system corpus is Apache-2.0 — see
`skills/design-artifact-loop/design-systems/LICENSE` and `ATTRIBUTION.md`.
