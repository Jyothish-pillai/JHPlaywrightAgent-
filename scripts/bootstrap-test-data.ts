/// <reference types="node" />

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const WORKBOOK_PATH = path.resolve(process.cwd(), 'test-data', 'test-data.xlsx');
const COMMON_DATA_SHEET = 'CommonData';

type DataRow = Record<string, string>;

interface SheetSeedConfig {
  sheetName: string;
  keyFields: string[];
  headers: string[];
  rows: DataRow[];
}

interface ScopeOptions {
  enabled: boolean;
  app?: string;
  functionality?: string;
  storyName?: string;
  userStoryFile?: string;
  env?: string;
  dryRun: boolean;
  testIds: string[];
}

const COMMON_HEADERS = [
  'APP',
  'ENV',
  'BASE_URL',
  'USERNAME',
  'PASSWORD',
  'TIMEOUT_MS',
];

function normalizeValue(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeToken(value: string): string {
  return String(value || '').trim().toUpperCase();
}

function deriveSheetName(app: string, functionalityPath: string): string {
  const cleanedApp = app.replace(/[^A-Za-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const cleanedPath = functionalityPath
    .replace(/[\\/]+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const raw = `${cleanedApp}_${cleanedPath}`;
  return raw.slice(0, 31);
}

function parseArgValue(flagName: string): string | undefined {
  const direct = process.argv.find((arg) => arg.startsWith(`${flagName}=`));
  if (direct) {
    return direct.slice(flagName.length + 1).trim();
  }

  const idx = process.argv.findIndex((arg) => arg === flagName);
  if (idx >= 0 && process.argv[idx + 1]) {
    return String(process.argv[idx + 1]).trim();
  }

  return undefined;
}

function parseCsv(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((item) => normalizeValue(item))
    .filter(Boolean);
}

function parseBoolean(value: string | undefined): boolean {
  const normalized = normalizeToken(value || '');
  return normalized === '1' || normalized === 'TRUE' || normalized === 'YES';
}

function slug(value: string): string {
  return normalizeToken(value).replace(/[^A-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function defaultTestId(storyName?: string, app?: string, functionality?: string): string {
  if (normalizeValue(storyName || '')) {
    return normalizeValue(storyName || '');
  }
  const appToken = slug(app || '') || 'APP';
  const funcToken = slug(functionality || '') || 'FLOW';
  return `${appToken}_${funcToken}_TC001`;
}

interface StoryExtract {
  scenarioName: string;
  baseUrl: string;
  username: string;
  password: string;
  expectedSuccessText: string;
}

function extractStoryValue(markdown: string, label: string): string {
  const rx = new RegExp(`^\\s*[-*]\\s*${label}\\s*:\\s*(.+)$`, 'im');
  const m = markdown.match(rx);
  return normalizeValue(m?.[1]);
}

function extractExpectedResult(markdown: string): string {
  const section = markdown.match(/##\s+Expected\s+Result\s*([\s\S]*)/i)?.[1] || '';
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean);
  return normalizeValue(lines[0] || '');
}

function extractScenarioName(markdown: string, storyName: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1];
  return normalizeValue(heading || storyName || 'Scenario');
}

function resolveStoryFile(scope: ScopeOptions): string | undefined {
  if (scope.userStoryFile) {
    return path.resolve(process.cwd(), scope.userStoryFile);
  }
  if (!scope.app || !scope.functionality || !scope.storyName) {
    return undefined;
  }
  return path.resolve(
    process.cwd(),
    'user-stories',
    scope.app,
    scope.functionality,
    `${scope.storyName}.md`,
  );
}

function readStoryExtract(scope: ScopeOptions): StoryExtract {
  const storyFile = resolveStoryFile(scope);
  const fallbackScenario = normalizeValue(scope.storyName || 'Scenario');

  if (!storyFile || !fs.existsSync(storyFile)) {
    return {
      scenarioName: fallbackScenario,
      baseUrl: '',
      username: '',
      password: '',
      expectedSuccessText: '',
    };
  }

  const markdown = fs.readFileSync(storyFile, 'utf-8');
  return {
    scenarioName: extractScenarioName(markdown, fallbackScenario),
    baseUrl: extractStoryValue(markdown, 'URL'),
    username: extractStoryValue(markdown, 'Username'),
    password: extractStoryValue(markdown, 'Password'),
    expectedSuccessText: extractExpectedResult(markdown),
  };
}

function getScopeOptions(): ScopeOptions {
  const positional = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('-'));

  const appArg = parseArgValue('--app');
  const functionalityArg = parseArgValue('--functionality');
  const storyArg = parseArgValue('--story');
  const testIdsArg = parseArgValue('--test-ids') || parseArgValue('--test-id');
  const userStoryFileArg = parseArgValue('--user-story-file');
  const envArg = parseArgValue('--env');
  const dryRunArg = parseArgValue('--dry-run');

  const app = normalizeToken(process.env.BOOTSTRAP_APP || appArg || positional[0] || '');
  const functionality = normalizeValue(process.env.BOOTSTRAP_FUNCTIONALITY || functionalityArg || positional[1] || '');
  const storyName = normalizeValue(process.env.STORY_NAME || process.env.BOOTSTRAP_STORY || storyArg || positional[2] || '');
  const userStoryFile = normalizeValue(process.env.BOOTSTRAP_USER_STORY_FILE || userStoryFileArg || '');
  const env = normalizeToken(process.env.TEST_ENV || process.env.BOOTSTRAP_ENV || envArg || 'QA');
  const testIds = parseCsv(process.env.BOOTSTRAP_TEST_IDS || testIdsArg);
  const dryRun = parseBoolean(process.env.BOOTSTRAP_DRY_RUN || dryRunArg || positional[3]);

  const enabled =
    normalizeToken(process.env.BOOTSTRAP_SCOPE || '') === 'STORY'
    || Boolean(app || functionality || storyName || userStoryFile || testIds.length > 0);

  return {
    enabled,
    app: app || undefined,
    functionality: functionality || undefined,
    storyName: storyName || undefined,
    userStoryFile: userStoryFile || undefined,
    env: env || undefined,
    dryRun,
    testIds,
  };
}

function buildDynamicScopedConfigs(scope: ScopeOptions): SheetSeedConfig[] {
  if (!scope.app || !scope.functionality) {
    throw new Error(
      'Scoped bootstrap requires both app and functionality. ' +
      'Provide --app and --functionality (or BOOTSTRAP_APP and BOOTSTRAP_FUNCTIONALITY).',
    );
  }

  const story = readStoryExtract(scope);
  const timeoutMs = normalizeValue(process.env.BOOTSTRAP_TIMEOUT_MS || '90000');
  const sheetName = deriveSheetName(scope.app, scope.functionality);
  const testIds = scope.testIds.length > 0
    ? scope.testIds
    : [defaultTestId(scope.storyName, scope.app, scope.functionality)];

  const commonRow: DataRow = {
    APP: scope.app,
    ENV: normalizeToken(scope.env || 'QA'),
    BASE_URL: story.baseUrl,
    USERNAME: story.username,
    PASSWORD: story.password,
    TIMEOUT_MS: timeoutMs,
  };

  const functionalRows: DataRow[] = testIds.map((testId) => ({
    TEST_ID: testId,
    EXPECTED_SUCCESS_TEXT: story.expectedSuccessText,
  }));

  return [
    {
      sheetName: COMMON_DATA_SHEET,
      keyFields: ['APP', 'ENV'],
      headers: COMMON_HEADERS,
      rows: [commonRow],
    },
    {
      sheetName,
      keyFields: ['TEST_ID'],
      headers: [
        'TEST_ID',
        'EXPECTED_SUCCESS_TEXT',
      ],
      rows: functionalRows,
    },
  ];
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): DataRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  return rawRows.map((row) => {
    const normalized: DataRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = normalizeValue(value);
    }
    return normalized;
  });
}

function upsertByKey(rows: DataRow[], rowToUpsert: DataRow, keyFields: string[]): DataRow[] {
  const idx = rows.findIndex((row) => keyFields.every((key) => row[key]?.toUpperCase() === rowToUpsert[key]?.toUpperCase()));
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...rowToUpsert };
  } else {
    rows.push(rowToUpsert);
  }
  return rows;
}

function writeSheet(
  workbook: XLSX.WorkBook,
  config: SheetSeedConfig,
): void {
  const allHeaders = Array.from(new Set([...config.headers, ...config.keyFields]));
  const normalizeToHeaders = (row: DataRow): DataRow => {
    const normalized: DataRow = {};
    for (const header of allHeaders) {
      normalized[header] = normalizeValue(row[header]);
    }
    return normalized;
  };

  const existingRows = getSheetRows(workbook, config.sheetName).map(normalizeToHeaders);
  let mergedRows = [...existingRows];

  for (const row of config.rows) {
    mergedRows = upsertByKey(mergedRows, normalizeToHeaders(row), config.keyFields);
  }

  const normalizedRows = mergedRows.map((row) => {
    const normalized: DataRow = {};
    for (const header of allHeaders) {
      normalized[header] = normalizeValue(row[header]);
    }
    return normalized;
  });

  const worksheet = XLSX.utils.json_to_sheet(normalizedRows, { header: allHeaders });
  workbook.Sheets[config.sheetName] = worksheet;

  if (!workbook.SheetNames.includes(config.sheetName)) {
    workbook.SheetNames.push(config.sheetName);
  }
}

function writeWorkbookWithRetry(workbook: XLSX.WorkBook, maxAttempts = 3): void {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      XLSX.writeFile(workbook, WORKBOOK_PATH);
      return;
    } catch (error) {
      lastError = error;
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code !== 'EBUSY' && code !== 'EPERM') {
        throw error;
      }
      if (attempt === maxAttempts) {
        break;
      }
    }
  }

  const code = (lastError as NodeJS.ErrnoException)?.code;
  if (code === 'EBUSY' || code === 'EPERM') {
    throw new Error(
      `Cannot write ${WORKBOOK_PATH} because it is locked. Close the Excel file and rerun npm run testdata:bootstrap.`,
    );
  }

  throw lastError as Error;
}

function main(): void {
  fs.mkdirSync(path.dirname(WORKBOOK_PATH), { recursive: true });

  const workbook = fs.existsSync(WORKBOOK_PATH)
    ? XLSX.readFile(WORKBOOK_PATH)
    : XLSX.utils.book_new();

  const scope = getScopeOptions();
  if (!scope.enabled) {
    throw new Error(
      'Dynamic mode requires scope input. Provide --app and --functionality ' +
      '(or BOOTSTRAP_APP and BOOTSTRAP_FUNCTIONALITY).',
    );
  }

  const finalConfigs = buildDynamicScopedConfigs(scope);
  const scopedSheet = finalConfigs[1]?.sheetName || 'UNKNOWN';
  const scopedIds = (finalConfigs[1]?.rows || []).map((row) => row.TEST_ID).join(', ');
  console.log(
    `[bootstrap scoped] APP=${scope.app} ENV=${scope.env} SHEET=${scopedSheet} ` +
    `TEST_IDS=${scopedIds}`,
  );

  for (const config of finalConfigs) {
    writeSheet(workbook, config);
  }

  if (scope.dryRun) {
    console.log('[bootstrap] Dry run enabled. Workbook write skipped.');
    return;
  }

  writeWorkbookWithRetry(workbook);
  console.log(`Excel test data is ready: ${WORKBOOK_PATH}`);
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
}

main();
