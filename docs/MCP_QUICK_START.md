# MCP Quick Start (Windows)

Use this when you need local MCP working in under 10 minutes.

## 1) Install

```powershell
npm ci
npx playwright install chrome
```

## 2) Verify MCP launch binaries

```powershell
Get-Item .\node_modules\.bin\playwright.cmd
Get-Item .\node_modules\.bin\playwright-mcp-server.cmd
```

## 3) Smoke test `playwright-test` MCP server

```powershell
npx tsx sandbox/test_local_mcp_browser.ts playwright-test https://example.com
```

Pass criteria:
- shows `Connected. Listing tools...`
- prints tool names
- runs `planner_setup_page`
- runs `browser_navigate` and `browser_snapshot`

## 4) Run Chrome-only tests

```powershell
npm run test:chrome
```

## 5) Open report

```powershell
npm run report
```

## 6) If something fails fast

1. `npm ci` again (missing bin scripts is usually install drift)
2. `npx playwright install chrome`
3. Avoid `npm run pipeline` unless `execution/pipeline_runner.ts` exists
4. For search/captcha issues:

```powershell
$env:SEARCH_ENGINE="bing"
npx tsx sandbox/test_local_mcp_google_android.ts "Latest Android version"
```

## 7) Done Criteria

- [ ] MCP smoke script passed
- [ ] Chrome-only test command works
- [ ] Report opens
- [ ] Team can reproduce on a clean machine
