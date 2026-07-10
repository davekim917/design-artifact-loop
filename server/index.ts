/**
 * design-review — standalone stdio MCP server for the design-artifact-loop plugin.
 *
 * Exposes the single `design_review` tool (see design-review.ts). Started by the
 * host harness via .mcp.json (Claude) or .codex-plugin/plugin.json (Codex).
 *
 * The engine resolves the loop root from DESIGN_ARTIFACT_LOOP_ROOT at module
 * load, so the default MUST be set before the dynamic import below. When the
 * server is spawned with cwd = the plugin root itself (Codex declares
 * `cwd: "."`, which resolves to the plugin cache dir — a directory that is
 * replaced on upgrade and owned by the harness), artifacts must not land
 * there; fall back to ~/design-artifacts (non-hidden: snap-packaged chromium
 * cannot read top-level dot-dirs under $HOME). Claude spawns with cwd = the
 * user's project dir, which keeps the engine's project-local default.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

// Walk up from this file to the directory carrying a plugin manifest. Works from
// both the TS source (<root>/server/) and the committed bundle (<root>/server/dist/),
// and never false-positives when cwd is merely an ancestor (e.g. $HOME) of the
// plugin rather than the plugin root itself.
function findPluginRoot(from: string): string | null {
  let d = from;
  for (;;) {
    if (fs.existsSync(path.join(d, '.claude-plugin')) || fs.existsSync(path.join(d, '.codex-plugin'))) return d;
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
}

const PLUGIN_ROOT = findPluginRoot(import.meta.dirname);
if (!process.env.DESIGN_ARTIFACT_LOOP_ROOT && PLUGIN_ROOT && path.resolve(process.cwd()) === PLUGIN_ROOT) {
  process.env.DESIGN_ARTIFACT_LOOP_ROOT = path.join(os.homedir(), 'design-artifacts');
}

// Low-level Server (not McpServer): the tool ships a pre-built JSON Schema, not zod shapes.
const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
const { designReviewTools } = await import('./design-review.js');

const server = new Server(
  { name: 'design-review', version: '1.2.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: designReviewTools.map((d) => d.tool),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const def = designReviewTools.find((d) => d.tool.name === req.params.name);
  if (!def) {
    return {
      content: [{ type: 'text' as const, text: `Error: unknown tool ${req.params.name}` }],
      isError: true,
    };
  }
  return def.handler((req.params.arguments ?? {}) as Record<string, unknown>);
});

await server.connect(new StdioServerTransport());
