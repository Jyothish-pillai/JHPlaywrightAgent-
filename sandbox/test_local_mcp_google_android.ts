import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';

const workspaceFolder = process.cwd();
const query = process.argv.slice(2).join(' ') || 'Latest Android version';
const searchEngine = (process.env.SEARCH_ENGINE || 'google').toLowerCase();
const searchHomeUrl = searchEngine === 'bing' ? 'https://www.bing.com' : 'https://www.google.com';

function preview(result: unknown): string {
  return JSON.stringify(result, null, 2).slice(0, 5000);
}

async function callTool(client: Client, name: string, args: Record<string, unknown>) {
  console.log(`\n>>> ${name}`);
  const result = await client.callTool({ name, arguments: args });
  console.log(preview(result));
  return result;
}

async function main() {
  const command = path.join(workspaceFolder, 'node_modules', '.bin', 'playwright.cmd');
  const transport = new StdioClientTransport({
    command,
    args: ['run-test-mcp-server'],
    cwd: workspaceFolder,
    stderr: 'pipe',
  });

  transport.stderr?.on('data', (chunk) => {
    const message = String(chunk).trim();
    if (message) {
      console.error(`[mcp stderr] ${message}`);
    }
  });

  const client = new Client({ name: 'local-mcp-google-search-test', version: '1.0.0' });

  try {
    console.log('Starting local playwright-test MCP server...');
    await client.connect(transport);
    console.log('Connected. Setting up Chromium page...');

    await callTool(client, 'planner_setup_page', {
      project: 'chromium',
      seedFile: 'tests/seed.spec.ts',
    });

    await callTool(client, 'browser_navigate', {
      url: searchHomeUrl,
      intent: `Open ${searchEngine} home page`,
    });

    const code = `async (page) => {
  const acceptButton = page.getByRole('button', { name: /accept all|i agree|agree|accept/i }).first();
  if (await acceptButton.count()) {
    await acceptButton.click().catch(() => undefined);
  }

  const searchBox = page.locator('textarea[name="q"], input[name="q"]').first();
  await searchBox.waitFor({ state: 'visible', timeout: 15000 });
  await searchBox.fill(${JSON.stringify(query)});
  await searchBox.press('Enter');
  await page.waitForLoadState('domcontentloaded');

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const hasRecaptcha = await page.locator('iframe[src*="recaptcha"]').count();
  if (page.url().includes('/sorry/') || hasRecaptcha || /unusual traffic/i.test(bodyText)) {
    throw new Error('Search engine returned an anti-automation challenge. Solve it manually or rerun with SEARCH_ENGINE=bing.');
  }

  const resultSelector = ${JSON.stringify(searchEngine)} === 'bing' ? 'li.b_algo h2 a' : 'a:has(h3)';
  await page.locator(resultSelector).first().waitFor({ state: 'visible', timeout: 15000 });

  const candidates = await page.locator(resultSelector).evaluateAll((anchors) => anchors
    .map((anchor) => {
      const heading = anchor.querySelector('h3');
      return { text: (heading?.textContent || anchor.textContent || '').trim(), href: anchor.href };
    })
    .filter((item) => item.href.startsWith('http'))
    .filter((item) => !item.href.includes('google.com/search'))
    .filter((item) => !item.href.includes('accounts.google.com'))
    .filter((item) => !item.href.includes('support.google.com'))
    .filter((item) => !item.href.includes('policies.google.com'))
    .filter((item) => !item.href.includes('google.com/policies'))
    .filter((item) => !item.href.includes('bing.com/search'))
    .filter((item) => item.text.length > 8));

  const preferred = candidates.find((item) => /android|version/i.test(item.text) || /android|wikipedia/i.test(item.href));
  const selected = preferred || candidates[0];
  if (!selected) {
    throw new Error('No usable search result links were found on Google.');
  }

  await page.goto(selected.href, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  return {
    query: ${JSON.stringify(query)},
    searchEngine: ${JSON.stringify(searchEngine)},
    selectedResultText: selected.text,
    selectedResultUrl: selected.href,
    finalTitle: await page.title(),
    finalUrl: page.url(),
    visibleTextStart: (await page.locator('body').innerText()).slice(0, 1200),
  };
}`;

    await callTool(client, 'browser_run_code_unsafe', {
      intent: `Search Google for ${query} and open a relevant result`,
      code,
    });

    await callTool(client, 'browser_snapshot', {
      intent: 'Read the final opened page snapshot',
    });
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});