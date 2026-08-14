const fs = require('fs');
const path = require('path');
const os = require('os');

function pad2(value) { return String(value).padStart(2, '0'); }

function toTimeStamp(date) {
  return [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join('') +
    '_' + [pad2(date.getHours()), pad2(date.getMinutes()), pad2(date.getSeconds())].join('');
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateTime(date) {
  const day = pad2(date.getDate());
  const mon = MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${day}-${mon}-${year} ${hh}:${mm}:${ss} IST`;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${pad2(s)}s`;
}

function formatMilliseconds(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0 ms';
  // Group thousands so long-running cases stay readable (e.g. 12,345 ms).
  const grouped = String(Math.round(ms)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped} ms`;
}

function htmlEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toSafeId(value) {
  return String(value == null ? '' : value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function sanitizeFileName(value) {
  return String(value || 'ExecutionReport').replace(/[^a-zA-Z0-9._-]/g, '');
}

function specNameFromPath(filePath) {
  if (!filePath) return null;
  const fileName = path.basename(filePath);
  if (!fileName) return null;
  return fileName.replace(/\.spec\.[cm]?tsx?$/i, '').replace(/\.[cm]?tsx?$/i, '');
}

function storyFromPath(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const testsIndex = parts.lastIndexOf('tests');
  if (testsIndex !== -1 && parts.length > testsIndex + 1) {
    const candidate = parts[testsIndex + 1];
    if (candidate && !candidate.endsWith('.spec.ts')) return candidate;
  }
  return null;
}

function derivePathMetadata(filePath) {
  const fallback = { application: 'Unknown', functionality: 'General' };
  if (!filePath) return fallback;

  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  const testsIdx = parts.lastIndexOf('tests');
  if (testsIdx === -1) return fallback;

  const application = parts[testsIdx + 1] || fallback.application;
  let functionality = fallback.functionality;

  const candidate = parts[testsIdx + 2];
  if (candidate && !candidate.endsWith('.spec.ts')) {
    functionality = candidate;
  } else if (application && !application.endsWith('.spec.ts')) {
    // Backward compatibility for paths like tests/<Functionality>/file.spec.ts
    functionality = application;
  }

  return { application, functionality };
}

function statusClass(status) {
  if (status === 'passed') return 'PASS';
  if (status === 'failed' || status === 'timedOut') return 'FAIL';
  if (status === 'skipped' || status === 'interrupted') return 'SKIP';
  return 'SKIP';
}

function statusCellClass(status) {
  if (status === 'PASS') return 'status-pass';
  if (status === 'FAIL') return 'status-fail';
  return 'status-skip';
}

function isApiTest(filePath) {
  if (!filePath) return false;
  // API test indicators: file path contains .spec.ts and is in tests/ directory
  // And doesn't have "ui" or "page" in the path which would indicate UI tests
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return /\.spec\.ts?$/i.test(filePath) && 
         !/\bui\b.*\.spec|page.*\.spec|visual.*\.spec/i.test(normalized);
}

function formatResponseBody(body) {
  if (!body) return null;
  try {
    // Try to parse as JSON and format
    const json = typeof body === 'string' ? JSON.parse(body) : body;
    return JSON.stringify(json, null, 2);
  } catch {
    // Return as-is if not JSON
    return String(body);
  }
}

function classifyError(message) {
  if (!message) return 'Unknown';
  if (/timeout/i.test(message)) return 'Timeout';
  if (/not found|unable to find|no element/i.test(message)) return 'Element Not Found';
  if (/expect|assertion|toBe|toHave|toBeVisible/i.test(message)) return 'Assertion Error';
  if (/navigation/i.test(message)) return 'Navigation Error';
  return 'Runtime Error';
}

function stripAnsi(value) {
  return String(value || '').replace(/\x1B\[[0-9;]*m/g, '');
}

function normalizeStepStatus(step) {
  return step && step.error ? 'FAIL' : 'PASS';
}

function shouldCaptureStep(step) {
  if (!step || typeof step.title !== 'string' || step.title.trim().length === 0) return false;

  const category = String(step.category || '').toLowerCase();

  // Keep user-authored test.step entries, expect checks, and Playwright API actions.
  if (category === 'test.step' || category === 'expect' || category === 'pw:api') return true;

  return false;
}

function pushCapturedStep(collection, step) {
  if (!shouldCaptureStep(step)) return;

  collection.push({
    title: step.title,
    category: step.category,
    duration: Number.isFinite(step.duration) ? step.duration : 0,
    status: normalizeStepStatus(step),
  });
}

function collectStepsFromResult(stepNodes) {
  const collected = [];

  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      pushCapturedStep(collected, node);
      walk(node.steps);
    }
  };

  walk(stepNodes);
  return collected;
}

function finalizeStepsForReport(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return [];

  const hasExplicitTestSteps = steps.some((step) => String(step.category || '').toLowerCase() === 'test.step');

  // UI tests in this framework typically use explicit test.step blocks.
  // Preserve earlier concise behavior by showing only those authored steps.
  if (hasExplicitTestSteps) {
    return steps.filter((step) => String(step.category || '').toLowerCase() === 'test.step');
  }

  // API tests often have no test.step wrappers; keep detailed Playwright/API + expect steps.
  return steps;
}

function copyScreenshotAsset(filePath, assetsDir, cache, usedNames) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    if (cache.has(filePath)) return cache.get(filePath);

    const parsed = path.parse(filePath);
    const safeBase = sanitizeFileName(parsed.name || 'screenshot') || 'screenshot';
    const ext = (parsed.ext || '.png').toLowerCase();

    let candidate = `${safeBase}${ext}`;
    let counter = 1;
    while (usedNames.has(candidate)) {
      candidate = `${safeBase}_${counter}${ext}`;
      counter++;
    }

    usedNames.add(candidate);
    const destination = path.join(assetsDir, candidate);
    fs.copyFileSync(filePath, destination);

    const relativeHref = `./${path.basename(assetsDir)}/${candidate}`;
    cache.set(filePath, relativeHref);
    return relativeHref;
  } catch {
    return null;
  }
}

function parseHealingLogs(testResultsDir) {
  const report = { files: [], actions: [], locators: [] };
  if (!fs.existsSync(testResultsDir)) return report;

  const walk = (dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const lower = entry.name.toLowerCase();
      if (!lower.includes('healing-log') || !lower.endsWith('.md')) continue;

      report.files.push(fullPath);
      const lines = fs.readFileSync(fullPath, 'utf-8').split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (/(heal|healing|fallback|re-?try|updated|replaced)/i.test(line) && /^[-*\d.]/.test(line)) {
          report.actions.push(line.replace(/^[-*\d.\s]+/, '').trim());
        }
        if (/(locator|selector)/i.test(line)) {
          report.locators.push(line.replace(/^[-*\d.\s]+/, '').trim());
        }
      }
    }
  };

  walk(testResultsDir);
  return report;
}

class FinalHtmlReporter {
  constructor() {
    this.records = [];
    this.storyCandidates = new Set();
    this.specNameCandidates = new Set();
    this.testStart = new Map();
    this.stepMap = new Map();
  }

  onBegin(config) {
    this.config = config;
  }

  onTestBegin(test, result) {
    const key = `${test.id}::${result.retry}`;
    this.testStart.set(key, Date.now());
    this.stepMap.set(key, []);

    const story = storyFromPath(test.location && test.location.file);
    if (story) this.storyCandidates.add(story);

    const specName = specNameFromPath(test.location && test.location.file);
    if (specName) this.specNameCandidates.add(specName);
  }

  onStepEnd(test, result, step) {
    const key = `${test.id}::${result.retry}`;
    const steps = this.stepMap.get(key) || [];

    pushCapturedStep(steps, step);
    this.stepMap.set(key, steps);
  }

  onTestEnd(test, result) {
    const key = `${test.id}::${result.retry}`;
    const start = this.testStart.get(key);
    let stepData = this.stepMap.get(key) || [];
    if (stepData.length === 0 && Array.isArray(result.steps) && result.steps.length > 0) {
      stepData = collectStepsFromResult(result.steps);
    }
    stepData = finalizeStepsForReport(stepData);
    const duration = Number.isFinite(result.duration) ? result.duration : (start ? Date.now() - start : 0);

    const screenshots = [];
    const traces = [];
    let apiResponseCode = null;
    let apiResponseBody = null;
    let apiRequestMethod = null;
    let apiRequestUrl = null;
    let apiRequestBodyDisplay = null;
    let apiRequestHeaders = null;
    let apiResponseStatus = null;
    let apiResponseStatusText = null;
    let apiResponseHeaders = null;

    for (const att of result.attachments || []) {
      if (att.path && ((att.contentType && att.contentType.startsWith('image/')) || /screenshot/i.test(att.name || ''))) {
        screenshots.push(att.path);
      }
      if (att.path && ((att.contentType && att.contentType.includes('zip')) || /trace/i.test(att.name || ''))) {
        traces.push(att.path);
      }
      // Capture API request data
      if (att.name === 'api-request-method' && att.body) {
        try {
          apiRequestMethod = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
      if (att.name === 'api-request-url' && att.body) {
        try {
          apiRequestUrl = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
      if (att.name === 'api-request-body-display' && att.body) {
        try {
          apiRequestBodyDisplay = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
      if (att.name === 'api-request-headers' && att.body) {
        try {
          apiRequestHeaders = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
      // Capture API response data from attachments
      if (att.name && att.name.startsWith('api-response-code-')) {
        try {
          apiResponseCode = parseInt(att.name.replace('api-response-code-', ''), 10);
        } catch {}
      }
      if (att.name === 'api-response-body' && att.body) {
        try {
          apiResponseBody = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
      if (att.name === 'api-response-status' && att.body) {
        try {
          apiResponseStatus = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
      if (att.name === 'api-response-status-text' && att.body) {
        try {
          apiResponseStatusText = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
      if (att.name === 'api-response-headers' && att.body) {
        try {
          apiResponseHeaders = typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('utf-8');
        } catch {}
      }
    }

    const titlePath = test.titlePath ? test.titlePath() : [];

    this.records.push({
      id: test.id,
      title: test.title,
      suite: titlePath.slice(1, -1).join(' > '),
      file: (test.location && test.location.file) || '',
      line: (test.location && test.location.line) || '',
      status: statusClass(result.status),
      retry: result.retry,
      duration,
      steps: stepData,
      errorMessage: stripAnsi(result.error ? (result.error.message || String(result.error)) : ''),
      errorStack: stripAnsi((result.error && result.error.stack) || ''),
      screenshots: Array.from(new Set(screenshots)),
      traces: Array.from(new Set(traces)),
      project: (test.parent && test.parent.project && test.parent.project().name) || '',
      apiRequestMethod,
      apiRequestUrl,
      apiRequestBodyDisplay,
      apiRequestHeaders,
      apiResponseCode,
      apiResponseStatus,
      apiResponseStatusText,
      apiResponseHeaders,
      apiResponseBody,
    });

    this.testStart.delete(key);
    this.stepMap.delete(key);
  }

  async onEnd() {
    const finishedAt = new Date();
    const testResultsDir = path.resolve(process.cwd(), 'test-results');
    const reportsDir = path.resolve(process.cwd(), 'final-reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    // Always prefer the currently executed spec name when a single spec is run.
    // This avoids stale STORY_NAME values from prior terminal sessions.
    let resolvedRunName = null;
    if (this.specNameCandidates.size === 1) {
      resolvedRunName = Array.from(this.specNameCandidates)[0];
    } else if (process.env.STORY_NAME) {
      resolvedRunName = process.env.STORY_NAME;
    } else if (this.storyCandidates.size === 1) {
      resolvedRunName = Array.from(this.storyCandidates)[0];
    } else {
      resolvedRunName = 'CombinedExecution';
    }

    const storyName = sanitizeFileName(resolvedRunName);

    const ts = toTimeStamp(finishedAt);
    const fileName = `${storyName}-${ts}.html`;
    const outputPath = path.join(reportsDir, fileName);
    const assetsDir = path.join(reportsDir, `${storyName}-${ts}-assets`);
    fs.mkdirSync(assetsDir, { recursive: true });

    const screenshotAssetCache = new Map();
    const usedScreenshotNames = new Set();

    const healing = parseHealingLogs(testResultsDir);

    const finalByTest = new Map();
    for (const r of this.records) finalByTest.set(r.id, r);

    const finalRecords = Array.from(finalByTest.values()).map((record, idx) => {
      const tcId = `TC${String(idx + 1).padStart(3, '0')}`;
      const pathMeta = derivePathMetadata(record.file);
      const functionality = pathMeta.functionality;

      return {
        ...record,
        tcId,
        application: pathMeta.application,
        functionality,
        safeFunctionality: toSafeId(functionality),
        safeCaseId: toSafeId(`${functionality}_${tcId}`),
      };
    });

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let totalDurationMs = 0;

    for (const r of finalRecords) {
      totalDurationMs += r.duration || 0;
      if (r.status === 'PASS') passed++;
      else if (r.status === 'FAIL') failed++;
      else skipped++;
    }

    const totalFinal = finalRecords.length;
    const passRate = totalFinal > 0 ? Math.round((passed / totalFinal) * 100) : 0;
    const expandStepsByDefault = failed === 0;

    const chromiumProject = (this.config && this.config.projects || []).find((p) =>
      (p.name || '').toLowerCase().includes('chrom')
    );
    const headless = chromiumProject ? chromiumProject.use && chromiumProject.use.headless !== false : true;

    const firstFailure = finalRecords.find((r) => r.status === 'FAIL');

    let bugCounter = 0;
    const defectRows = [];

    const groupedByFunctionality = new Map();
    for (const record of finalRecords) {
      if (!groupedByFunctionality.has(record.functionality)) groupedByFunctionality.set(record.functionality, []);
      groupedByFunctionality.get(record.functionality).push(record);
    }

    const summaryRowsHtml = finalRecords.map((record) => {
      const totalSteps = record.steps.length;
      const passedSteps = record.steps.filter((s) => s.status === 'PASS').length;
      const failedSteps = record.steps.filter((s) => s.status === 'FAIL').length;
      const searchText = `${record.tcId} ${record.title} ${record.functionality}`;

      return `
        <tr data-status="${record.status}" data-search="${htmlEscape(searchText)}">
          <td class="center"><a href="#${record.safeCaseId}" onclick="openTestCase('${record.safeFunctionality}','${record.safeCaseId}')">${record.tcId}</a></td>
          <td class="center">${htmlEscape(record.title)}</td>
          <td class="center">${htmlEscape(record.functionality)}</td>
          <td class="center">${totalSteps}</td>
          <td class="center ok">${passedSteps}</td>
          <td class="center bad">${failedSteps}</td>
          <td class="center" data-duration-ms="${Math.max(0, Math.round(record.duration || 0))}">${formatMilliseconds(record.duration)}</td>
          <td class="center" style="font-weight:700;color:${record.status === 'PASS' ? '#2e7d32' : record.status === 'FAIL' ? '#c62828' : '#9c6b00'};">${record.status}</td>
        </tr>`;
    }).join('');

    const functionalitySectionsHtml = Array.from(groupedByFunctionality.entries()).map(([functionality, records]) => {
      const safeFunctionality = toSafeId(functionality);
      const hasFailure = records.some((r) => r.status === 'FAIL');
      const functionalityOpen = hasFailure || expandStepsByDefault;

      const casesHtml = records.map((record) => {
        const testcaseOpen = record.status === 'FAIL' || expandStepsByDefault;

        const screenshotLinks = record.screenshots.map((fp) => {
          const href = copyScreenshotAsset(fp, assetsDir, screenshotAssetCache, usedScreenshotNames);
          if (!href) return `<span class="mono-sm">${htmlEscape(path.basename(fp))}</span>`;
          return `<a href="${htmlEscape(href)}" target="_blank" class="screenshot-link">View</a>`;
        });
        const screenshotHtml = screenshotLinks.length ? screenshotLinks.join(' | ') : 'N/A';

        const traceHtml = record.traces.length
          ? record.traces.map((fp) => `<div class="mono-sm">${htmlEscape(path.relative(process.cwd(), fp).replace(/\\/g, '/'))}</div>`).join('')
          : '';

        const firstFailedStep = record.steps.find((s) => s.status === 'FAIL');
        const errType = classifyError(record.errorMessage);

        if (record.status === 'FAIL') {
          bugCounter++;
          defectRows.push({
            id: `BUG-${String(bugCounter).padStart(3, '0')}`,
            tcId: record.tcId,
            title: record.title,
            errType,
          });
        }

        const firstFailureHtml = record.status === 'FAIL'
          ? `<div class="failure-digest">
              <h4>First Failure Summary</h4>
              <p><strong>Failed Step:</strong> ${firstFailedStep ? htmlEscape(firstFailedStep.title) : 'N/A'}</p>
              <p><strong>Error Type:</strong> ${htmlEscape(errType)}</p>
              <p><strong>Error:</strong> ${htmlEscape((record.errorMessage || '').split('\n')[0] || 'N/A')}</p>
              <p><strong>Evidence:</strong> ${screenshotHtml}</p>
              ${traceHtml ? `<p><strong>Trace:</strong></p>${traceHtml}` : ''}
              <p><strong>Source:</strong> ${htmlEscape(record.file)}${record.line ? `:${record.line}` : ''}</p>
              ${record.errorStack ? `<details><summary>Stack Trace</summary><pre class="err-pre">${htmlEscape(record.errorStack)}</pre></details>` : ''}
            </div>`
          : '';

        const stepsRowsHtml = record.steps.map((step, idx) => `
          <tr>
            <td class="center">${idx + 1}</td>
            <td>${htmlEscape(step.title)}</td>
            <td>${htmlEscape(step.status === 'PASS' ? 'Step completed successfully' : 'Step failed during execution')}</td>
            <td class="${statusCellClass(step.status)}">${step.status}</td>
            <td class="center">${step.status === 'FAIL' ? screenshotHtml : 'N/A'}</td>
          </tr>`).join('') ||
          '<tr><td colspan="5" class="center">No step telemetry captured</td></tr>';

        const isApiTestCase = isApiTest(record.file);

        // Show the response link when ANY response telemetry was captured, not just the body.
        // A test that fails before attaching the body still has status/headers worth triaging.
        const hasResponseData = Boolean(record.apiResponseBody || record.apiResponseStatus || record.apiResponseHeaders);
        const hasRequestData = Boolean(record.apiRequestMethod || record.apiRequestUrl);

        const apiLinksHtml = isApiTestCase && (hasRequestData || hasResponseData)
          ? `<div class="api-links-section">
              <strong>API Details:</strong>
              ${hasRequestData ? `<a href="javascript:void(0)" onclick="openApiContentInNewTab('request', '${toSafeId(record.safeCaseId)}', event)" class="api-link">📄 Request Body</a>` : ''}
              ${hasResponseData ? `<a href="javascript:void(0)" onclick="openApiContentInNewTab('response', '${toSafeId(record.safeCaseId)}', event)" class="api-link">📄 Response Body</a>` : ''}
            </div>`
          : '';

        return `
          <div id="${record.safeCaseId}" class="testcase-header" onclick="toggleTestCase('${record.safeCaseId}')">
            <span id="icon_${record.safeCaseId}" class="toggle-icon">${testcaseOpen ? '-' : '+'}</span>${record.tcId} ${htmlEscape(record.title)}
          </div>
          <div id="body_${record.safeCaseId}" class="testcase-body${testcaseOpen ? ' open' : ''}" style="display:${testcaseOpen ? 'block' : 'none'};">
            ${firstFailureHtml}
            <table>
              <tr><th>Step #</th><th>Test Steps</th><th>Actual Result</th><th>Status</th><th>Screenshot</th></tr>
              ${stepsRowsHtml}
            </table>
            ${apiLinksHtml}
            <script type="application/json" id="apiData_${toSafeId(record.safeCaseId)}_request" style="display:none;">
              {"method":"${(record.apiRequestMethod || 'N/A').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}","url":"${(record.apiRequestUrl || 'N/A').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}","headers":"${(record.apiRequestHeaders || '{}').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}","body":"${(record.apiRequestBodyDisplay || 'No Request Body').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}
            </script>
            <script type="application/json" id="apiData_${toSafeId(record.safeCaseId)}_response" style="display:none;">
              {"status":"${record.apiResponseStatus || 'N/A'}","statusText":"${(record.apiResponseStatusText || 'N/A').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}","headers":"${(record.apiResponseHeaders || '{}').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}","body":"${(record.apiResponseBody ? (typeof record.apiResponseBody === 'string' ? record.apiResponseBody : JSON.stringify(record.apiResponseBody)) : 'No response').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"}
            </script>
          </div>`;
      }).join('');

      return `
        <div class="functionality-header" onclick="toggleFunctionality('${safeFunctionality}')">
          <span id="icon_func_${safeFunctionality}" class="toggle-icon">${functionalityOpen ? '-' : '+'}</span>${htmlEscape(functionality)}
        </div>
        <div id="body_func_${safeFunctionality}" class="functionality-body" style="display:${functionalityOpen ? 'block' : 'none'};">
          ${casesHtml}
        </div>`;
    }).join('');

    const defectsHtml = defectRows.length === 0
      ? '<div class="no-defects">No defects found - All tests passed!</div>'
      : `<table>
          <thead>
            <tr><th>Bug ID</th><th>Severity</th><th>TC ID</th><th>Description</th><th>Error Type</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${defectRows.map((d) => `
              <tr>
                <td><strong>${htmlEscape(d.id)}</strong></td>
                <td><span class="status-chip warn">High</span></td>
                <td>${htmlEscape(d.tcId)}</td>
                <td>${htmlEscape(d.title)}</td>
                <td>${htmlEscape(d.errType)}</td>
                <td><span class="status-chip info">New</span></td>
              </tr>`).join('')}
          </tbody>
        </table>`;

    const healingActionsHtml = healing.actions.length
      ? `<ol class="heal-list">${healing.actions.map((a) => `<li>${htmlEscape(a)}</li>`).join('')}</ol>`
      : '<div class="no-data">No healing actions recorded in healing-log files.</div>';

    const recommendations = [];
    if (failed > 0) recommendations.push('Investigate and fix the failing test cases before next release cycle.');
    if (skipped > 0) recommendations.push('Review skipped tests and validate environment/test data readiness.');
    if (healing.actions.length > 0) recommendations.push(`Back-port ${healing.actions.length} healing change(s) to related scripts.`);
    recommendations.push('Add negative scenarios to improve coverage depth.');
    recommendations.push('Run these tests in CI for every pull request.');

    const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${htmlEscape(storyName)} - Test Execution Report</title>
<style>
:root{--bg:#f4f7fb;--surface:#ffffff;--ink:#172033;--muted:#5f6b84;--line:#d8deeb;--ok:#28a745;--bad:#dc3545;--warn:#ffc107;--info:#0dcaf0;--shadow:0 4px 14px rgba(20,34,66,.08);} 
[data-theme="dark"]{--bg:#0f172a;--surface:#1e293b;--ink:#e2e8f0;--muted:#94a3b8;--line:#334155;--shadow:0 4px 14px rgba(0,0,0,.45);} 
*{box-sizing:border-box;margin:0;padding:0;} 
body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;background:radial-gradient(circle at top right,#e9f0ff 0%,var(--bg) 45%);color:var(--ink);padding:20px;transition:background .25s,color .25s;} 
.report{max-width:1320px;margin:0 auto;} 
.title{background:linear-gradient(135deg,#243b8b 0%,#1b2a6b 100%);color:#fff;padding:18px;text-align:center;border-radius:8px 8px 0 0;font-size:24px;font-weight:700;letter-spacing:.3px;} 
.meta{background:#fff;border:1px solid var(--line);border-top:none;padding:12px 14px;display:flex;flex-wrap:wrap;gap:14px;color:var(--muted);border-radius:0 0 8px 8px;margin-bottom:16px;box-shadow:var(--shadow);font-size:13px;} 
.hdr-actions{margin-left:auto;display:flex;gap:8px;} 
.btn{padding:7px 12px;border-radius:6px;border:1px solid var(--line);cursor:pointer;font-size:12px;font-weight:600;background:var(--surface);color:var(--ink);} 
.btn:hover{opacity:.9;} 
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px;} 
.kpi{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px;box-shadow:var(--shadow);} 
.kpi .label{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:7px;} 
.kpi .value{font-size:27px;font-weight:700;line-height:1;} 
.kpi .sub{margin-top:6px;color:var(--muted);font-size:12px;} 
.ok{color:var(--ok);} .bad{color:var(--bad);} .warn{color:#9c6b00;} 
.panel{background:var(--surface);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);margin-bottom:16px;overflow:hidden;} 
.panel-head{background:linear-gradient(135deg,#ff9800 0%,#ef6c00 100%);color:#fff;padding:12px 14px;font-size:16px;font-weight:700;letter-spacing:.3px;} 
.panel-body{padding:12px;} 
.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;} 
.toolbar input{flex:1;min-width:220px;border:1px solid var(--line);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--ink);background:var(--surface);} 
.filter-btn{border:1px solid var(--line);border-radius:16px;padding:6px 12px;font-size:12px;cursor:pointer;background:var(--surface);font-weight:600;color:var(--ink);} 
.filter-btn.active{background:#1b2a6b;color:#fff;border-color:#1b2a6b;} 
table{width:100%;border-collapse:collapse;background:#fff;} 
th{text-align:center;background:#dff0df;border:1px solid #333;padding:10px;font-size:12px;} 
td{border:1px solid #333;padding:9px;font-size:13px;vertical-align:top;} 
.center{text-align:center;} 
.status-pass,.status-fail,.status-skip{color:#fff;font-weight:700;text-align:center;width:90px;} 
.status-pass{background:#43a047;} .status-fail{background:#e53935;} .status-skip{background:#fbc02d;color:#222;} 
.functionality-header,.testcase-header{cursor:pointer;user-select:none;} 
.functionality-header{background:#1b2a6b;color:#fff;padding:12px 14px;font-size:18px;font-weight:700;margin-top:12px;border-radius:6px;} 
.testcase-header{background:#fff;border:1px solid #ccc;padding:10px 12px;font-size:16px;font-weight:700;margin-top:8px;border-radius:6px;} 
.toggle-icon{display:inline-block;width:18px;text-align:center;margin-right:8px;font-weight:700;} 
.functionality-body,.testcase-body{display:none;margin-left:10px;margin-top:8px;margin-bottom:10px;} 
.testcase-body.open{display:block;} 
.failure-digest{border:1px solid #f3b6b6;background:#fff5f5;border-radius:6px;padding:10px;margin:10px 0;} 
.failure-digest h4{margin-bottom:8px;color:#a22020;font-size:13px;text-transform:uppercase;letter-spacing:.4px;} 
.failure-digest p{font-size:13px;margin:4px 0;} 
.err-pre{background:#fff5f5;border:1px solid #fecaca;border-radius:6px;padding:10px;font-size:12px;font-family:Consolas,monospace;white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto;color:#7f1d1d;} 
.screenshot-link{color:#1976d2;text-decoration:none;} .screenshot-link:hover{text-decoration:underline;} 
.sec{background:var(--surface);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);margin-top:16px;overflow:hidden;} 
.sec-hdr{padding:12px 14px;background:#f8fafc;border-bottom:1px solid var(--line);font-size:14px;font-weight:700;} 
.sec-body{padding:12px;} 
.status-chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:16px;font-size:12px;font-weight:600;} 
.status-chip.warn{background:#fff3cd;color:#856404;} 
.status-chip.info{background:#cce5ff;color:#004085;} 
.no-defects{padding:12px;border-radius:6px;background:#d4edda;color:#155724;font-weight:700;} 
.heal-list{margin:6px 0 0 18px;font-size:13px;} 
.heal-list li{padding:3px 0;border-bottom:1px solid var(--line);} 
.heal-list li:last-child{border-bottom:none;} 
.no-data{color:var(--muted);font-size:13px;} 
.env-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;} 
.env-item{display:flex;flex-direction:column;gap:3px;} 
.env-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);} 
.env-val{font-size:13px;font-weight:500;} 
.rec-list{list-style:none;} 
.rec-item{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);} 
.rec-item:last-child{border-bottom:none;} 
.rec-dot{flex-shrink:0;width:8px;height:8px;border-radius:50%;background:var(--info);margin-top:5px;} 
.api-links-section{background:#e8f4f8;border:1px solid #0066cc;border-radius:4px;padding:12px;margin:12px 0;font-size:13px;} 
.api-links-section strong{color:#0066cc;display:block;margin-bottom:8px;} 
.api-link{color:#0066cc;text-decoration:none;padding:6px 12px;background:#cce5ff;border-radius:4px;display:inline-block;margin-right:8px;margin-bottom:8px;cursor:pointer;font-weight:500;} 
.api-link:hover{background:#b3d9ff;text-decoration:underline;} 
@media print{.hdr-actions,.toolbar{display:none!important;}body{background:#fff!important;padding:0;}.report{max-width:100%;}} 
@media (max-width:860px){.title{font-size:20px;}th,td{font-size:12px;padding:8px;}.functionality-header{font-size:16px;}.testcase-header{font-size:14px;}}
</style>
</head>
<body>
<div class="report">
  <div class="title">Automation Execution Summary Report</div>
  <div class="meta">
    <div><strong>Application:</strong> ${htmlEscape(storyName)}</div>
    <div><strong>Environment:</strong> ${htmlEscape(process.env.TEST_ENV || 'QA')}</div>
    <div><strong>Browser:</strong> Chromium</div>
    <div><strong>Execution Time:</strong> ${formatDateTime(finishedAt)}</div>
    <div><strong>Run Duration:</strong> ${formatDuration(totalDurationMs)}</div>
    <div class="hdr-actions">
      <button class="btn" onclick="toggleTheme()">Dark Mode</button>
      <button class="btn" onclick="window.print()">Print</button>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="label">Total Tests</div><div class="value">${totalFinal}</div><div class="sub">${totalFinal} executed</div></div>
    <div class="kpi"><div class="label">Passed</div><div class="value ok">${passed}</div><div class="sub">${passRate}% pass rate</div></div>
    <div class="kpi"><div class="label">Failed</div><div class="value bad">${failed}</div><div class="sub">${failed ? 'Needs attention' : 'No failures'}</div></div>
    <div class="kpi"><div class="label">Skipped</div><div class="value warn">${skipped}</div><div class="sub">${skipped ? 'Review skipped tests' : 'No skips'}</div></div>
  </div>

  <div class="panel">
    <div class="panel-head">Execution Summary</div>
    <div class="panel-body">
      <div class="toolbar">
        <input id="searchInput" type="text" placeholder="Search by Test Case ID, Name, or Functionality" oninput="applyFilters()" />
        <button class="filter-btn active" onclick="setStatusFilter('all', this)">All</button>
        <button class="filter-btn" onclick="setStatusFilter('PASS', this)">PASS</button>
        <button class="filter-btn" onclick="setStatusFilter('FAIL', this)">FAIL</button>
        <button class="filter-btn" onclick="setStatusFilter('SKIP', this)">SKIP</button>
      </div>
      <table id="summaryTable">
        <thead>
          <tr>
            <th>Test Case ID</th>
            <th>Test Case Name</th>
            <th>Functionality</th>
            <th>Total Steps</th>
            <th>Passed Steps</th>
            <th>Failed Steps</th>
            <th>Execution Time</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRowsHtml || '<tr><td colspan="8" class="center">No test results recorded</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  ${functionalitySectionsHtml || '<div class="panel"><div class="panel-body">No test case details available.</div></div>'}
</div>

<script>
  let currentFilter = 'all';

  function toggleTheme() {
    const h = document.documentElement;
    h.setAttribute('data-theme', h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  function toggleTestCase(id) {
    const body = document.getElementById('body_' + id);
    const icon = document.getElementById('icon_' + id);
    if (!body || !icon) return;
    if (body.style.display === 'none' || body.style.display === '') {
      body.style.display = 'block';
      body.classList.add('open');
      icon.innerHTML = '-';
    } else {
      body.style.display = 'none';
      body.classList.remove('open');
      icon.innerHTML = '+';
    }
  }

  function toggleFunctionality(id) {
    const body = document.getElementById('body_func_' + id);
    const icon = document.getElementById('icon_func_' + id);
    if (!body || !icon) return;
    if (body.style.display === 'none' || body.style.display === '') {
      body.style.display = 'block';
      icon.innerHTML = '-';
    } else {
      body.style.display = 'none';
      icon.innerHTML = '+';
    }
  }

  function openTestCase(func, testcaseId) {
    const funcBody = document.getElementById('body_func_' + func);
    const funcIcon = document.getElementById('icon_func_' + func);
    if (funcBody && (funcBody.style.display === 'none' || funcBody.style.display === '')) {
      funcBody.style.display = 'block';
      if (funcIcon) funcIcon.innerHTML = '-';
    }

    const testBody = document.getElementById('body_' + testcaseId);
    const testIcon = document.getElementById('icon_' + testcaseId);
    if (testBody && (testBody.style.display === 'none' || testBody.style.display === '')) {
      testBody.style.display = 'block';
      testBody.classList.add('open');
      if (testIcon) testIcon.innerHTML = '-';
    }
  }

  function setStatusFilter(status, btn) {
    currentFilter = status;
    const buttons = document.querySelectorAll('.toolbar .filter-btn');
    for (let i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    applyFilters();
  }

  function applyFilters() {
    const q = (document.getElementById('searchInput').value || '').toLowerCase();
    const rows = document.querySelectorAll('#summaryTable tbody tr');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const status = row.getAttribute('data-status');
      const search = (row.getAttribute('data-search') || '').toLowerCase();
      const matchesStatus = currentFilter === 'all' || status === currentFilter;
      const matchesQuery = !q || search.indexOf(q) >= 0 || row.textContent.toLowerCase().indexOf(q) >= 0;
      row.style.display = (matchesStatus && matchesQuery) ? '' : 'none';
    }
  }

  function openApiContentInNewTab(type, testcaseId, event) {
    event.preventDefault();
    const dataElement = document.getElementById('apiData_' + testcaseId + '_' + type);
    if (!dataElement) {
      alert('No ' + type + ' data found for this test case');
      return;
    }
    
    try {
      const data = JSON.parse(dataElement.textContent);
      let content = '';
      
      if (type === 'request') {
        content = '<h2>Request Details</h2>';
        content += '<p><strong>Method:</strong> ' + (data.method || 'N/A') + '</p>';
        content += '<p><strong>URL:</strong> ' + (data.url || 'N/A') + '</p>';
        
        // Display headers
        if (data.headers) {
          content += '<h3>Headers:</h3>';
          try {
            const headers = JSON.parse(data.headers);
            Object.keys(headers).forEach(function(key) {
              content += '<p style="margin-left:20px;"><strong>' + key + ':</strong> ' + headers[key] + '</p>';
            });
          } catch (e) {
            content += '<p>' + data.headers + '</p>';
          }
        }
        
        // Display body
        if (data.body && data.body !== 'No Request Body (GET request)') {
          content += '<h3>Request Body:</h3>';
          let bodyContent = data.body;
          try {
            const parsed = JSON.parse(bodyContent);
            bodyContent = JSON.stringify(parsed, null, 2);
          } catch (e) {
            // Keep as-is if not JSON
          }
          content += '<pre style="background:#f9f9f9;padding:15px;border:1px solid #ddd;border-radius:4px;overflow:auto;font-family:Consolas,monospace;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;">' + bodyContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
        } else {
          content += '<h3>Request Body:</h3>';
          content += '<pre style="background:#f9f9f9;padding:15px;border:1px solid #ddd;border-radius:4px;overflow:auto;font-family:Consolas,monospace;font-size:14px;line-height:1.5;">' + (data.body || 'No Request Body') + '</pre>';
        }
      } else if (type === 'response') {
        content = '<h2>Response Details</h2>';
        content += '<p><strong>Status Code:</strong> ' + (data.status || 'N/A') + '</p>';
        if (data.statusText) {
          content += '<p><strong>Status Message:</strong> ' + data.statusText + '</p>';
        }
        if (data.responseTime) {
          content += '<p><strong>Response Time:</strong> ' + data.responseTime + '</p>';
        }
        
        // Display headers
        if (data.headers) {
          content += '<h3>Response Headers:</h3>';
          try {
            const headers = JSON.parse(data.headers);
            Object.keys(headers).forEach(function(key) {
              content += '<p style="margin-left:20px;"><strong>' + key + ':</strong> ' + headers[key] + '</p>';
            });
          } catch (e) {
            content += '<p>' + data.headers + '</p>';
          }
        }
        
        // Display body
        content += '<h3>Response Body:</h3>';
        let bodyContent = data.body || 'No body';
        try {
          const parsed = JSON.parse(bodyContent);
          bodyContent = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // If not JSON, just use as-is
        }
        content += '<pre style="background:#f9f9f9;padding:15px;border:1px solid #ddd;border-radius:4px;overflow:auto;font-family:Consolas,monospace;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;">' + bodyContent.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>';
      }
      
      const newWindow = window.open('', 'apiContent_' + testcaseId + '_' + type, 'width=1000,height=800,scrollbars=yes');
      if (newWindow) {
        newWindow.document.write('<!DOCTYPE html>');
        newWindow.document.write('<html>');
        newWindow.document.write('<head>');
        newWindow.document.write('<meta charset="UTF-8">');
        newWindow.document.write('<title>API ' + type.charAt(0).toUpperCase() + type.slice(1) + ' - ' + testcaseId + '</title>');
        newWindow.document.write('<style>');
        newWindow.document.write('body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; background: #f5f5f5; color: #333; }');
        newWindow.document.write('.container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }');
        newWindow.document.write('h2 { color: #0066cc; border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 15px; font-size: 24px; }');
        newWindow.document.write('h3 { color: #333; margin-top: 20px; margin-bottom: 10px; font-size: 18px; }');
        newWindow.document.write('p { line-height: 1.8; margin: 10px 0; font-size: 15px; }');
        newWindow.document.write('strong { color: #0066cc; }');
        newWindow.document.write('pre { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 4px; overflow: auto; max-height: 600px; font-size: 14px; line-height: 1.5; }');
        newWindow.document.write('</style>');
        newWindow.document.write('</head>');
        newWindow.document.write('<body>');
        newWindow.document.write('<div class="container">');
        newWindow.document.write(content);
        newWindow.document.write('</div>');
        newWindow.document.write('</body>');
        newWindow.document.write('</html>');
        newWindow.document.close();
      }
    } catch (e) {
      alert('Error opening ' + type + ' content: ' + e.message);
    }
  }
</script>
</body>
</html>`;

    fs.writeFileSync(outputPath, html, 'utf-8');
    process.stdout.write(`\n[final-html-reporter] Report saved: ${outputPath}\n`);
  }
}

module.exports = FinalHtmlReporter;
