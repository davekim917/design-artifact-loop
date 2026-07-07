/**
 * design-review — standalone stdio MCP server for the design-artifact-loop plugin.
 *
 * Exposes the single `design_review` tool (see design-review.ts). Started by the
 * host harness via .mcp.json at the plugin root: `bun server/index.ts`.
 */
// Low-level Server (not McpServer): the tool ships a pre-built JSON Schema, not zod shapes.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { designReviewTools } from './design-review.js';

const server = new Server(
  { name: 'design-review', version: '1.0.0' },
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
