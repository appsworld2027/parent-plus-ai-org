Patch the exact candidate below, SHA-256 a41732f6d1efc1cdb30b507ea215b160e0f31dcf1d8c738fe02d2305f8889bcb.
Use the candidate bytes and the actual AC-06 failure as the starting state. The failure showed two previous-child cards during loading, where zero were expected.

=== EXACT CANDIDATE (do not change anything except the minimal fix) ===
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurora Parent — Coach-reviewed Feedback Preview</title>
  <style>
    * {
      box-sizing: border-box;
    }

    :root {
      --color-bg: #fafafa;
      --color-surface: #ffffff;
      --color-text: #1a1a2e;
      --color-text-muted: #6b6b80;
      --color-border: #e0e0e8;
      --color-border-focus: #2563eb;
      --color-primary: #2563eb;
      --color-primary-hover: #1d4ed8;
      --color-error: #dc2626;
      --color-error-bg: #fef2f2;
      --color-success: #16a34a;
      --color-focus-ring: rgba(37, 99, 235, 0.4);
      --radius-sm: 6px;
      --radius-md: 10px;
      --radius-lg: 14px;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.08);
      --transition-fast: 120ms ease;
      --transition-normal: 200ms ease;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --color-bg: #1a1a2e;
        --color-surface: #22223b;
        --color-text: #f0f0f5;
        --color-text-muted: #9a9ab0;
        --color-border: #3a3a5a;
        --color-border-focus: #60a5fa;
        --color-primary: #60a5fa;
        --color-primary-hover: #93c5fd;
        --color-error: #f87171;
        --color-error-bg: #3b1a1a;
        --color-success: #4ade80;
        --color-focus-ring: rgba(96, 165, 250, 0.4);
      }
    }

    body {
      margin: 0;
      font-family: var(--font-sans);
      font-size: 16px;
      line-height: 1.5;
      color: var(--color-text);
      background: var(--color-bg);
      min-height: 100vh;
      padding: 24px;
    }

    .container {
      max-width: 640px;
      margin: 0 auto;
    }

    .preview-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      background: var(--color-border);
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }

    .lead {
      font-size: 16px;
      color: var(--color-text-muted);
      margin: 0 0 32px;
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
    }

    select {
      appearance: none;
      background: var(--color-surface);
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text);
      font-family: inherit;
      font-size: 16px;
      padding: 12px 44px 12px 16px;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b6b80' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      background-size: 20px;
    }

    select:hover {
      border-color: var(--color-text-muted);
    }

    select:focus {
      outline: none;
      border-color: var(--color-border-focus);
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .status {
      min-height: 24px;
      font-size: 15px;
      color: var(--color-text-muted);
      margin-bottom: 16px;
      transition: opacity var(--transition-fast);
    }

    .status.loading {
      color: var(--color-primary);
    }

    .status.empty {
      color: var(--color-text-muted);
    }

    .status.inactive {
      color: var(--color-text-muted);
    }

    .status.error {
      color: var(--color-error);
    }

    .status.offline {
      color: var(--color-error);
    }

    .retry-button {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      padding: 12px 24px;
      cursor: pointer;
      transition: background-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
      margin-bottom: 16px;
    }

    .retry-button:focus {
      outline: none;
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    .retry-button:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .retry-button:active:not(:disabled) {
      transform: scale(0.98);
    }

    .retry-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .retry-button.visible {
      display: flex;
    }

    .feedback-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .feedback-item {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      animation: fadeIn var(--transition-normal) ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .feedback-item article {
      padding: 20px;
    }

    .feedback-header {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 8px 12px;
      margin-bottom: 12px;
    }

    .coach-name {
      font-weight: 600;
      font-size: 15px;
      color: var(--color-text);
    }

    .feedback-date {
      font-size: 13px;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .feedback-text {
      font-size: 15px;
      line-height: 1.6;
      color: var(--color-text);
      margin: 0;
      white-space: pre-wrap;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="preview-badge">Fictional Preview</span>
    <h1>Coach-reviewed Feedback</h1>
    <p class="lead">Review approved coaching notes for your child.</p>

    <div class="controls">
      <div class="control-group">
        <label for="child-select">Child</label>
        <select id="child-select" name="child">
          <option value="alex" selected>Alex</option>
          <option value="jamie">Jamie</option>
          <option value="sam">Sam</option>
          <option value="taylor">Taylor</option>
        </select>
      </div>

      <div class="control-group">
        <label for="scenario-select">Demo scenario</label>
        <select id="scenario-select" name="scenario">
          <option value="normal" selected>Normal</option>
          <option value="slow">Slow</option>
          <option value="fail-once">Fail once</option>
        </select>
      </div>
    </div>

    <div id="status" class="status" role="status" aria-live="polite"></div>
    <button id="retry-btn" class="retry-button" type="button">Retry</button>

    <ul id="feedback-list" class="feedback-list" aria-label="Coach feedback"></ul>
  </div>

  <script>
    (function() {
      'use strict';

      // Fixture data
      const FIXTURES = {
        alex: [
          { coach: 'Coach Morgan', date: '22 Nov 2026', text: 'Practised a steady landing.' },
          { coach: 'Coach Morgan', date: '15 Nov 2026', text: 'Remembered the warm-up sequence.' }
        ],
        jamie: [
          { coach: 'Coach Morgan', date: '18 Nov 2026', text: 'Took turns during the relay.' }
        ],
        sam: [],
        taylor: null // inactive
      };

      // Copy strings (exact curly apostrophes)
      const COPY = {
        loading: 'Loading feedback',
        empty: 'No reviewed feedback yet',
        inactive: 'Feedback connection inactive',
        offline: 'You’re offline. Reconnect and retry',
        error: 'Couldn’t load feedback'
      };

      // State
      let currentChild = 'alex';
      let currentScenario = 'normal';
      let abortController = null;
      let failOnceTriggered = false;
      let isLoading = false;
      let lastSuccessfulChild = null;
      let lastSuccessfulNotes = null;

      // DOM elements
      const childSelect = document.getElementById('child-select');
      const scenarioSelect = document.getElementById('scenario-select');
      const statusEl = document.getElementById('status');
      const retryBtn = document.getElementById('retry-btn');
      const feedbackList = document.getElementById('feedback-list');

      // Set initial values
      childSelect.value = currentChild;
      scenarioSelect.value = currentScenario;

      function setStatus(message, type = '') {
        statusEl.textContent = message;
        statusEl.className = 'status';
        if (type) {
          statusEl.classList.add(type);
        }
      }

      function showRetry(show) {
        retryBtn.classList.toggle('visible', show);
        retryBtn.disabled = !show;
      }

      function clearFeedback() {
        feedbackList.replaceChildren();
      }

      function renderFeedback(notes) {
        clearFeedback();
        if (!notes || notes.length === 0) {
          return;
        }

        const fragment = document.createDocumentFragment();

        notes.forEach(note => {
          const li = document.createElement('li');
          li.className = 'feedback-item';

          const article = document.createElement('article');

          const header = document.createElement('div');
          header.className = 'feedback-header';

          const coach = document.createElement('span');
          coach.className = 'coach-name';
          coach.textContent = note.coach;

          const date = document.createElement('time');
          date.className = 'feedback-date';
          date.dateTime = note.date;
          date.textContent = note.date;

          header.appendChild(coach);
          header.appendChild(date);

          const text = document.createElement('p');
          text.className = 'feedback-text';
          text.textContent = note.text;

          article.appendChild(header);
          article.appendChild(text);
          li.appendChild(article);
          fragment.appendChild(li);
        });

        feedbackList.appendChild(fragment);
      }

      async function loadFeedback(child, scenario) {
        if (abortController) {
          abortController.abort();
        }
        abortController = new AbortController();
        const signal = abortController.signal;

        isLoading = true;
        setStatus(COPY.loading, 'loading');
        showRetry(false);

        try {
          // Check online state
          if (!navigator.onLine) {
            throw new Error('offline');
          }

          // Simulate delay for slow scenario
          if (scenario === 'slow') {
            await new Promise(resolve => setTimeout(resolve, 600));
            if (signal.aborted) return;
          }

          // Handle fail-once scenario
          if (scenario === 'fail-once' && !failOnceTriggered) {
            failOnceTriggered = true;
            throw new Error('fail-once');
          }

          // Get fixture data
          const data = FIXTURES[child];

          if (signal.aborted) return;

          if (data === null) {
            // Inactive child
            setStatus(COPY.inactive, 'inactive');
            clearFeedback();
            lastSuccessfulChild = null;
            lastSuccessfulNotes = null;
          } else if (data.length === 0) {
            // Connected but empty
            setStatus(COPY.empty, 'empty');
            clearFeedback();
            lastSuccessfulChild = child;
            lastSuccessfulNotes = [];
          } else {
            // Has feedback
            setStatus('', '');
            renderFeedback(data);
            lastSuccessfulChild = child;
            lastSuccessfulNotes = data;
          }
        } catch (error) {
          if (signal.aborted) return;

          if (error.message === 'offline') {
            setStatus(COPY.offline, 'offline');
            clearFeedback();
          } else if (error.message === 'fail-once') {
            setStatus(COPY.error, 'error');
            clearFeedback();
            showRetry(true);
          } else {
            setStatus(COPY.error, 'error');
            clearFeedback();
            showRetry(true);
          }
        } finally {
          isLoading = false;
        }
      }

      function handleChildChange() {
        const newChild = childSelect.value;
        const scenario = scenarioSelect.value;

        // If only scenario changed to slow, keep showing last successful child's notes
        // But if child actually changed, clear immediately and show loading
        if (newChild !== currentChild) {
          currentChild = newChild;
          failOnceTriggered = false; // Reset fail-once for new child
          loadFeedback(currentChild, scenario);
        } else if (scenario === 'slow' && currentScenario !== 'slow') {
          // Only scenario changed to slow - keep last successful notes visible
          // The load will happen on next child change
          currentScenario = scenario;
        } else {
          currentScenario = scenario;
        }
      }

      function handleScenarioChange() {
        const newScenario = scenarioSelect.value;
        const child = childSelect.value;

        if (newScenario === 'fail-once') {
          // Immediate action on current child
          currentScenario = newScenario;
          failOnceTriggered = false; // Reset the one-shot flag
          clearFeedback();
          loadFeedback(child, newScenario);
        } else if (newScenario === 'slow') {
          // Slow mode waits for next child selection
          currentScenario = newScenario;
        } else {
          // Normal mode - reload current child
          currentScenario = newScenario;
          failOnceTriggered = false;
          loadFeedback(child, newScenario);
        }
      }

      function handleRetry() {
        const child = childSelect.value;
        const scenario = scenarioSelect.value;

        // Bypass the simulated failure
        failOnceTriggered = true;
        loadFeedback(child, scenario);
      }

      function handleOnline() {
        // If we're in a failed state and come online, retry automatically
        if (retryBtn.classList.contains('visible') && !isLoading) {
          handleRetry();
        }
      }

      function handleOffline() {
        if (isLoading) {
          // Current load will handle offline check
        }
      }

      // Event listeners
      childSelect.addEventListener('change', handleChildChange);
      scenarioSelect.addEventListener('change', handleScenarioChange);
      retryBtn.addEventListener('click', handleRetry);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initial load
      loadFeedback(currentChild, currentScenario);
    })();
  </script>
</body>
</html>
=== END CANDIDATE ===

=== AC-06 FAILURE EVIDENCE (from run 45803763122) ===
not ok 6 - AC-06 clears previous feedback during loading
  ---
  duration_ms: 186.320906
  type: 'test'
  location: 'feedback.mjs:37:3'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:
    
    2 !== 0
    
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 0
  actual: 2
  operator: 'strictEqual'
  stack: |-
    file:///home/runner/work/parent-plus-ai-org/parent-plus-ai-org/trial/autonomy/parent-feedback-preview/tests/acceptance/feedback.mjs:96:10
    async TestContext.<anonymous> (file:///home/runner/work/parent-plus-ai-org/parent-plus-ai-org/trial/autonomy/parent-feedback-preview/tests/acceptance/feedback.mjs:44:7)
    async Test.run (node:internal/test_runner/test:1054:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
  ...

Test AC-06 does:
1. Start with Alex (2 notes visible)
2. Switch scenario to "slow"
3. Switch child to Jamie
4. Wait for "Loading feedback" text
5. Assert cards(page).count() === 0  ← THIS FAILED: got 2 (Alex's cards still showing)
6. Wait for Jamie's note to appear

The bug: when switching to "slow" scenario then changing child, the code keeps showing the previous child's cards during loading instead of clearing them immediately.

Write waitlist.mjs as plain text. The first line must be exactly ===BEFORE===, followed by a short unique verbatim source snippet, retaining its indentation. Then write a line exactly ===AFTER===, followed by its minimal JavaScript replacement, retaining indentation. End with a line exactly ===END===. Do not escape quotes, add Markdown fences, or emit the full document. The runner applies just this replacement to the verified base.
