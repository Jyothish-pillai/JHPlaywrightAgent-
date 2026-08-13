/**
 * excel-data.ts
 * Utility to load and merge test data from test-data/test-data.xlsx.
 *
 * Sheet layout assumptions:
 *   - "CommonData" sheet: one row of data per environment (APP, ENV, BASE_URL, …)
 *   - App-specific sheets (e.g., "MagicBox_StartNewPlacement"): rows where the
 *     first column "TEST_ID" identifies each test case.
 *
 * getMergedTestData() returns a flat record merging CommonData (filtered by APP)
 * with the matching functional-sheet row (filtered by TEST_ID).
 * Functional-sheet values take precedence over CommonData values when keys collide.
 */

import * as path from 'path';
import * as XLSX from 'xlsx';

const WORKBOOK_PATH = path.resolve(process.cwd(), 'test-data', 'test-data.xlsx');
const COMMON_DATA_SHEET = 'CommonData';

type DataRecord = Record<string, string>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && XLSX.SSF) {
    // Keep numbers as strings without scientific notation
    return String(value);
  }
  return String(value).trim();
}

function sheetToRecords(sheet: XLSX.WorkSheet): DataRecord[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  return rows.map(row => {
    const record: DataRecord = {};
    for (const [key, val] of Object.entries(row)) {
      record[key.trim().toUpperCase()] = normalizeValue(val);
    }
    return record;
  });
}

function loadWorkbook(): XLSX.WorkBook {
  try {
    return XLSX.readFile(WORKBOOK_PATH);
  } catch (err) {
    throw new Error(
      `Cannot open test-data workbook at "${WORKBOOK_PATH}". ` +
      `Ensure the file exists and is a valid .xlsx file. Original error: ${err}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GetMergedTestDataOptions {
  /** Application name used to filter CommonData rows (matches the APP column). */
  app: string;
  /** Exact sheet name containing the functional test rows. */
  sheetName: string;
  /** Value in the TEST_ID column that identifies the desired row. */
  testId: string;
  /** Keys that must be present (and non-empty) in the merged result. */
  requiredFields?: string[];
}

/**
 * Reads the Excel workbook, merges the CommonData row for `app` with the
 * functional-sheet row identified by `testId`, and returns a flat string map.
 *
 * Functional-sheet values override CommonData values on key collision.
 * All keys are normalised to UPPER_SNAKE_CASE.
 */
export function getMergedTestData(options: GetMergedTestDataOptions): DataRecord {
  const { app, sheetName, testId, requiredFields = [] } = options;
  const wb = loadWorkbook();

  // ── CommonData ──────────────────────────────────────────────────────────
  let commonRecord: DataRecord = {};
  if (wb.SheetNames.includes(COMMON_DATA_SHEET)) {
    const records = sheetToRecords(wb.Sheets[COMMON_DATA_SHEET]);
    // Pick the row where APP matches (case-insensitive); fall back to first row
    const match = records.find(r => r['APP']?.toLowerCase() === app.toLowerCase());
    commonRecord = match ?? records[0] ?? {};
  }

  // ── Functional sheet ─────────────────────────────────────────────────────
  if (!wb.SheetNames.includes(sheetName)) {
    throw new Error(
      `Sheet "${sheetName}" not found in workbook. ` +
      `Available sheets: ${wb.SheetNames.join(', ')}`,
    );
  }
  const functionalRecords = sheetToRecords(wb.Sheets[sheetName]);
  const functionalRow = functionalRecords.find(
    r => r['TEST_ID']?.toUpperCase() === testId.toUpperCase(),
  );
  if (!functionalRow) {
    throw new Error(
      `TEST_ID "${testId}" not found in sheet "${sheetName}". ` +
      `Available IDs: ${functionalRecords.map(r => r['TEST_ID']).filter(Boolean).join(', ')}`,
    );
  }

  // ── Merge (functional overrides common) ──────────────────────────────────
  const merged: DataRecord = { ...commonRecord, ...functionalRow };

  // ── Validate required fields ──────────────────────────────────────────────
  const missing = requiredFields
    .map(f => f.toUpperCase())
    .filter(f => !merged[f]);

  if (missing.length > 0) {
    throw new Error(
      `The following required fields are missing or empty in the merged test data ` +
      `(app="${app}", sheet="${sheetName}", testId="${testId}"): ${missing.join(', ')}`,
    );
  }

  return merged;
}

/**
 * Converts a comma-separated string to a trimmed, non-empty string array.
 * Safe to call with undefined / null — returns [].
 */
export function csvToList(value: string | undefined | null): string[] {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
