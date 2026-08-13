import { McpClient } from '../execution/agents/mcp_client';

async function main() {
  const client = new McpClient(process.cwd());
  await client.start();
  try {
    const tools = await client.listTools();
    for (const t of tools) {
      if (t.name === 'planner_save_plan' || t.name === 'planner_submit_plan' || t.name === 'planner_setup_page') {
        console.log(`\n=== ${t.name} ===`);
        console.log(JSON.stringify(t.inputSchema, null, 2));
      }
    }
  } finally {
    client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
