import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';

type ServerName = 'playwright' | 'playwright-test';

const workspaceFolder = process.cwd();
const serverName = (process.argv[2] ?? 'playwright-test') as ServerName;
const targetUrl = process.argv[3] ?? 'https://example.com';

const servers: Record<ServerName, { command: string; args: string[] }> = {
  playwright: {
    command: path.join(workspaceFolder, 'node_modules', '.bin', 'playwright-mcp-server.cmd'),
    args: [],
  },
  'playwright-test': {
    command: path.join(workspaceFolder, 'node_modules', '.bin', 'playwright.cmd'),
    args: ['run-test-mcp-server'],
  },
};

function textFromResult(result: unknown): string {
  return JSON.stringify(result, null, 2).slice(0, 4000);
}

async function main() {
  const server = servers[serverName];
  if (!server) {
    throw new Error(`Unknown server "${serverName}". Use "playwright" or "playwright-test".`);
  }

  console.log(`Starting local MCP server: ${serverName}`);
  console.log(`${server.command} ${server.args.join(' ')}`.trim());

  const transport = new StdioClientTransport({
    command: server.command,
    args: server.args,
    cwd: workspaceFolder,
    stderr: 'pipe',
  });

  transport.stderr?.on('data', (chunk) => {
    const message = String(chunk).trim();
    if (message) {
      console.error(`[mcp stderr] ${message}`);
    }
  });

  const client = new Client({ name: 'local-mcp-smoke-test', version: '1.0.0' });

  try {
    await client.connect(transport);
    console.log('Connected. Listing tools...');

    const toolsResponse = await client.listTools();
    const toolNames = toolsResponse.tools.map((tool) => tool.name).sort();
    console.log(toolNames.join('\n'));

    if (serverName === 'playwright-test' && toolNames.includes('planner_setup_page')) {
      console.log('\nCalling planner_setup_page first because playwright-test tools require an active test page...');
      const setup = await client.callTool({
        name: 'planner_setup_page',
        arguments: { project: 'chromium', seedFile: 'tests/seed.spec.ts' },
      });
      console.log(textFromResult(setup));
    }

    const navigateTool = toolNames.includes('browser_navigate')
      ? 'browser_navigate'
      : toolNames.includes('playwright_navigate')
        ? 'playwright_navigate'
        : undefined;
    if (!navigateTool) {
      throw new Error('The server did not expose browser_navigate. See the listed tools above.');
    }

    console.log(`\nCalling ${navigateTool} with URL: ${targetUrl}`);
    const result = await client.callTool({
      name: navigateTool,
      arguments: navigateTool === 'browser_navigate' && serverName === 'playwright-test'
        ? { url: targetUrl, intent: `Navigate to ${targetUrl}` }
        : navigateTool === 'playwright_navigate'
          ? { url: targetUrl, browserType: 'chromium', headless: false }
          : { url: targetUrl },
    });

    console.log('\nTool result:');
    console.log(textFromResult(result));

    const snapshotTool = toolNames.includes('browser_snapshot')
      ? 'browser_snapshot'
      : toolNames.includes('playwright_get_visible_text')
        ? 'playwright_get_visible_text'
        : undefined;
    if (snapshotTool) {
      console.log(`\nCalling ${snapshotTool} to prove the page loaded...`);
      const snapshot = await client.callTool({
        name: snapshotTool,
        arguments: snapshotTool === 'browser_snapshot' && serverName === 'playwright-test'
          ? { intent: `Read page snapshot for ${targetUrl}` }
          : {},
      });
      console.log(textFromResult(snapshot));
    }
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});