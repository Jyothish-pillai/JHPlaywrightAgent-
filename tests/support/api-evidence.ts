/**
 * api-evidence.ts
 * Single entry point for executing API calls inside Playwright tests.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS MODULE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * A failing `expect()` THROWS. It does not mark-and-continue. Everything
 * lexically after the first failed assertion in a test — including every
 * remaining `test.step()` — becomes dead code for that run.
 *
 * That means any `test.info().attach()` placed after an assertion only ever
 * runs when the test PASSES, which is exactly when the evidence is not needed.
 * Specs that attached the response body in a later step produced failure
 * reports reading "No response", because the test died on the status assertion
 * several steps earlier.
 *
 * The fix is structural, not advisory. This module enforces the three phases:
 *
 *   PHASE 1  EXECUTE   — issue the HTTP call
 *   PHASE 2  CAPTURE   — read the body once and attach ALL evidence
 *   PHASE 3  VALIDATE  — assert against the returned snapshot (no I/O)
 *
 * Phases 1 and 2 happen inside `callApi()` before it returns, so a spec
 * physically cannot place capture after validation. Phase 3 lives in the spec
 * and operates purely on already-captured data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ATTACHMENT NAMING
 * ─────────────────────────────────────────────────────────────────────────────
 * Two sets are attached per call:
 *
 *  1. Canonical names (`api-request-*`, `api-response-*`) consumed by
 *     reporters/final-html-reporter.cjs today. The reporter keys on exact
 *     names and overwrites on each match, so for a multi-call test the LAST
 *     call wins. That is the correct triage default: if a test fails while
 *     validating call 3, call 3 is what you want to inspect; if it fails on
 *     call 1, call 1 was the only call made.
 *
 *  2. One consolidated `api-call-{n}` JSON blob per call, holding the complete
 *     snapshot. Nothing is lost for multi-call tests, so the reporter can later
 *     render one block per call without every spec needing to change.
 */

import { test, type APIRequestContext, type APIResponse, type TestInfo } from '@playwright/test';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

/** Describes the call to make. */
export interface ApiCallSpec {
  method: HttpMethod;
  url: string;
  /** Headers explicitly set by the test (these are what get reported as sent). */
  headers?: Record<string, string>;
  /** JSON request body. Omit for GET/HEAD. */
  data?: unknown;
  /** Query string parameters. */
  params?: Record<string, string | number | boolean>;
  /** Optional label used in attachment metadata (defaults to "METHOD url"). */
  label?: string;
}

/**
 * An immutable record of one completed API call. All validation should read
 * from this object rather than re-touching the live APIResponse, so assertions
 * stay pure and the body is never read twice.
 */
export interface ApiSnapshot {
  readonly callIndex: number;
  readonly label: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly requestHeaders: Record<string, string>;
  readonly requestBodyText: string;
  readonly status: number;
  readonly statusText: string;
  readonly ok: boolean;
  readonly headers: Record<string, string>;
  readonly bodyText: string;
  readonly durationMs: number;
  /** The raw Playwright response, for the rare case a test needs it. */
  readonly response: APIResponse;
  /** Parse the captured body text as JSON. Throws on malformed JSON. */
  json<T = unknown>(): T;
  /** Case-insensitive response header lookup. */
  header(name: string): string | undefined;
}

// Per-test call counter. Keyed on the TestInfo object so parallel workers and
// retries never share state, and nothing needs resetting between tests.
const callCounters = new WeakMap<TestInfo, number>();

function nextCallIndex(info: TestInfo): number {
  const next = (callCounters.get(info) ?? 0) + 1;
  callCounters.set(info, next);
  return next;
}

function describeRequestBody(method: HttpMethod, data: unknown): string {
  if (data === undefined || data === null) {
    // Keep the exact wording the HTML reporter special-cases for GET.
    return method === 'GET'
      ? 'No Request Body (GET request)'
      : `No Request Body (${method} request)`;
  }
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

/**
 * PHASE 1 + PHASE 2 — execute the call and capture every piece of evidence
 * before returning. Never place assertions inside this function; validation is
 * the caller's job and must happen after the snapshot is in hand.
 */
export async function callApi(
  request: APIRequestContext,
  spec: ApiCallSpec,
): Promise<ApiSnapshot> {
  const info = test.info();
  const callIndex = nextCallIndex(info);
  const label = spec.label ?? `${spec.method} ${spec.url}`;
  const requestHeaders = spec.headers ?? {};
  const requestBodyText = describeRequestBody(spec.method, spec.data);

  // ── PHASE 1: EXECUTE ──────────────────────────────────────────────────────
  const startedAt = Date.now();
  const response: APIResponse = await request.fetch(spec.url, {
    method: spec.method,
    headers: spec.headers,
    data: spec.data as never,
    params: spec.params,
  });
  const durationMs = Date.now() - startedAt;

  // Read the body exactly once, immediately. Doing this here — rather than in a
  // later validation step — is the whole point of this module.
  const bodyText = await response.text();

  const snapshot: ApiSnapshot = Object.freeze({
    callIndex,
    label,
    method: spec.method,
    url: spec.url,
    requestHeaders,
    requestBodyText,
    status: response.status(),
    statusText: response.statusText(),
    ok: response.ok(),
    headers: response.headers(),
    bodyText,
    durationMs,
    response,
    json<T = unknown>(): T {
      return JSON.parse(bodyText) as T;
    },
    header(name: string): string | undefined {
      return response.headers()[name.toLowerCase()];
    },
  });

  // ── PHASE 2: CAPTURE ──────────────────────────────────────────────────────
  await attachEvidence(info, snapshot);

  return snapshot;
}

/**
 * Attaches both the canonical reporter-facing items and the consolidated
 * per-call blob. Awaited so the attachments are registered before control
 * returns to the spec and any assertion gets a chance to throw.
 */
async function attachEvidence(info: TestInfo, s: ApiSnapshot): Promise<void> {
  const text = 'text/plain';
  const json = 'application/json';

  // Canonical names — consumed by reporters/final-html-reporter.cjs.
  await info.attach('api-request-method', { body: s.method, contentType: text });
  await info.attach('api-request-url', { body: s.url, contentType: text });
  await info.attach('api-request-headers', {
    body: JSON.stringify(s.requestHeaders, null, 2),
    contentType: json,
  });
  await info.attach('api-request-body-display', { body: s.requestBodyText, contentType: json });

  await info.attach('api-response-status', { body: String(s.status), contentType: text });
  await info.attach('api-response-status-text', {
    body: s.statusText || (s.ok ? 'OK' : 'Error'),
    contentType: text,
  });
  await info.attach('api-response-headers', {
    body: JSON.stringify(s.headers, null, 2),
    contentType: json,
  });
  await info.attach('api-response-body', { body: s.bodyText, contentType: json });

  // Consolidated per-call blob — forward-compatible with multi-call rendering.
  await info.attach(`api-call-${s.callIndex}`, {
    body: JSON.stringify(
      {
        callIndex: s.callIndex,
        label: s.label,
        request: {
          method: s.method,
          url: s.url,
          headers: s.requestHeaders,
          body: s.requestBodyText,
        },
        response: {
          status: s.status,
          statusText: s.statusText,
          headers: s.headers,
          body: s.bodyText,
        },
        durationMs: s.durationMs,
      },
      null,
      2,
    ),
    contentType: json,
  });
}
