import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';

const workspaceFolder = process.cwd();
const productName = 'Dr.Ortho Flexi Ease Men Shoes';

function compact(result: unknown): string {
  return JSON.stringify(result, null, 2).slice(0, 12000);
}

async function main() {
  const transport = new StdioClientTransport({
    command: path.join(workspaceFolder, 'node_modules', '.bin', 'playwright.cmd'),
    args: ['run-test-mcp-server'],
    cwd: workspaceFolder,
    stderr: 'pipe',
  });

  transport.stderr?.on('data', (chunk) => {
    const message = String(chunk).trim();
    if (message) console.error(`[mcp stderr] ${message}`);
  });

  const client = new Client({ name: 'amazon-search-observer', version: '1.0.0' });

  try {
    await client.connect(transport);

    console.log('>>> planner_setup_page');
    console.log(compact(await client.callTool({
      name: 'planner_setup_page',
      arguments: { project: 'chromium', seedFile: 'tests/seed.spec.ts' },
    })));

    console.log('>>> browser_run_code_unsafe');
    const result = await client.callTool({
      name: 'browser_run_code_unsafe',
      arguments: {
        intent: `Explore Amazon search for ${productName} and open a matching product information page`,
        code: `async (page) => {
  const productName = ${JSON.stringify(productName)};
  const observations = {
    productName,
    attemptedUrls: [],
    pages: [],
    elements: [],
    selectedProduct: null,
    blocker: null,
    finalUrl: null,
    finalTitle: null,
    bodyTextStart: null,
  };

  async function recordPage(stage) {
    observations.pages.push({ stage, url: page.url(), title: await page.title() });
  }

  async function isBlocked() {
    const body = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    return /captcha|robot|automated access|enter the characters|sorry/i.test(body);
  }

  const searchUrls = [
    'https://www.amazon.in',
    'https://www.amazon.in/s?k=' + encodeURIComponent(productName),
    'https://www.amazon.com/s?k=' + encodeURIComponent(productName),
  ];

  for (const url of searchUrls) {
    observations.attemptedUrls.push(url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
    await page.waitForTimeout(2500);
    await recordPage('loaded ' + url);
    if (await isBlocked()) {
      observations.blocker = 'Amazon displayed bot/captcha/automated access protection.';
      continue;
    }

    const searchBox = page.locator('input[name="field-keywords"], #twotabsearchtextbox').first();
    if (await searchBox.count()) {
      observations.elements.push({ type: 'searchbox', selector: 'input[name="field-keywords"], #twotabsearchtextbox', placeholder: await searchBox.getAttribute('placeholder').catch(() => null), ariaLabel: await searchBox.getAttribute('aria-label').catch(() => null) });
      if (!page.url().includes('/s?')) {
        await searchBox.fill(productName);
        await searchBox.press('Enter');
        await page.waitForLoadState('domcontentloaded').catch(() => undefined);
        await page.waitForTimeout(3000);
        await recordPage('search results after entering product name');
      }
    }

    if (await isBlocked()) {
      observations.blocker = 'Amazon displayed bot/captcha/automated access protection after search.';
      continue;
    }

    const resultCards = page.locator('[data-component-type="s-search-result"]');
    const resultCount = await resultCards.count();
    observations.elements.push({ type: 'searchResults', selector: '[data-component-type="s-search-result"]', count: resultCount });

    if (resultCount > 0) {
      const candidates = await resultCards.evaluateAll((cards) => cards.slice(0, 8).map((card) => {
        const title = card.querySelector('h2 span')?.textContent?.trim() || '';
        const link = card.querySelector('h2 a, a.a-link-normal.s-no-outline')?.href || '';
        const imageAlt = card.querySelector('img')?.getAttribute('alt') || '';
        const price = card.querySelector('.a-price .a-offscreen')?.textContent?.trim() || '';
        const rating = card.querySelector('.a-icon-alt')?.textContent?.trim() || '';
        return { title, link, imageAlt, price, rating };
      }));
      observations.elements.push({ type: 'resultCandidates', candidates });

      const matching = candidates.find((candidate) => /dr\.?\s*ortho|flexi|ease|shoe/i.test(candidate.title + ' ' + candidate.imageAlt)) || candidates[0];
      if (matching?.link) {
        observations.selectedProduct = matching;
        await page.goto(matching.link, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
        await page.waitForTimeout(3500);
        await recordPage('product information page');
        break;
      }
    }
  }

  const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  const productTitle = await page.locator('#productTitle').innerText({ timeout: 5000 }).catch(() => '');
  const price = await page.locator('#corePriceDisplay_desktop_feature_div .a-offscreen, #priceblock_ourprice, #priceblock_dealprice').first().innerText({ timeout: 5000 }).catch(() => '');
  const rating = await page.locator('#acrPopover .a-icon-alt, .reviewCountTextLinkedHistogram .a-icon-alt').first().innerText({ timeout: 5000 }).catch(() => '');
  const addToCartVisible = await page.locator('#add-to-cart-button, input[name="submit.add-to-cart"]').first().isVisible({ timeout: 5000 }).catch(() => false);
  const buyNowVisible = await page.locator('#buy-now-button, input[name="submit.buy-now"]').first().isVisible({ timeout: 5000 }).catch(() => false);
  const imageVisible = await page.locator('#landingImage, #imgTagWrapperId img').first().isVisible({ timeout: 5000 }).catch(() => false);

  observations.finalUrl = page.url();
  observations.finalTitle = await page.title();
  observations.bodyTextStart = bodyText.slice(0, 1600);
  observations.elements.push({ type: 'pip', productTitle, price, rating, imageVisible, addToCartVisible, buyNowVisible });

  return observations;
}`,
      },
    });
    console.log(compact(result));

    console.log('>>> browser_snapshot');
    console.log(compact(await client.callTool({
      name: 'browser_snapshot',
      arguments: { intent: 'Capture final Amazon observation snapshot' },
    })));
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});