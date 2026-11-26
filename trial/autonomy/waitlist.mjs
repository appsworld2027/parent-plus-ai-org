<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coach Feedback Preview — Fictional Demo</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      --fg: #1a1a2e;
      --fg-muted: #4a4a6a;
      --bg: #f8f8fc;
      --card-bg: #ffffff;
      --border: #d0d0e0;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --error: #dc2626;
      --error-bg: #fef2f2;
      --focus: #2563eb;
      --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
      --radius: 8px;
      --transition: 150ms ease;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --fg: #e8e8f0;
        --fg-muted: #a0a0b8;
        --bg: #141420;
        --card-bg: #1c1c2a;
        --border: #3a3a50;
        --accent: #60a5fa;
        --accent-hover: #93c5fd;
        --error: #f87171;
        --error-bg: #2a1414;
        --focus: #60a5fa;
        --shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
      }
    }
    html { font-size: 16px; -webkit-text-size-adjust: 100%; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--fg);
      line-height: 1.6;
      padding: 2rem 1rem;
    }
    .container { max-width: 640px; margin: 0 auto; }
    .header {
      margin-bottom: 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.25rem;
      color: var(--fg);
    }
    .preview-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--border);
      color: var(--fg-muted);
      padding: 0.25rem 0.625rem;
      border-radius: 999px;
    }
    .controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.5rem;
      background: var(--card-bg);
      padding: 1.5rem;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .control-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--fg);
    }
    select {
      appearance: none;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.625rem 2.5rem 0.625rem 0.875rem;
      font-size: 1rem;
      font-family: inherit;
      color: var(--fg);
      cursor: pointer;
      transition: border-color var(--transition), box-shadow var(--transition);
      min-width: 200px;
    }
    select:hover { border-color: var(--accent); }
    select:focus {
      outline: none;
      border-color: var(--focus);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus) 30%, transparent);
    }
    select:disabled { opacity: 0.5; cursor: not-allowed; }
    .feedback-area {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      min-height: 200px;
      transition: opacity var(--transition);
    }
    .feedback-area.loading { opacity: 0.6; pointer-events: none; }
    .feedback-list {
      list-style: none;
      margin: 0;
      padding: 1rem;
    }
    .feedback-item {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .feedback-item:last-child { border-bottom: none; }
    .feedback-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      font-size: 0.8rem;
      color: var(--fg-muted);
      margin-bottom: 0.5rem;
    }
    .feedback-coach { font-weight: 600; color: var(--fg); }
    .feedback-date { white-space: nowrap; }
    .feedback-text {
      margin: 0;
      font-size: 0.9375rem;
      line-height: 1.5;
      color: var(--fg);
    }
    .status {
      padding: 1.5rem;
      text-align: center;
      color: var(--fg-muted);
    }
    .status.loading { color: var(--accent); }
    .status.empty { color: var(--fg-muted); }
    .status.error {
      background: var(--error-bg);
      color: var(--error);
      border-radius: var(--radius);
      margin: 1rem;
      padding: 1rem 1.5rem;
    }
    .status.inactive { color: var(--fg-muted); }
    .status.offline { color: var(--error); }
    .retry-btn {
      margin-top: 1rem;
      padding: 0.625rem 1.5rem;
      font-size: 0.9375rem;
      font-weight: 500;
      font-family: inherit;
      color: #fff;
      background: var(--accent);
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: background var(--transition), transform 0.05s ease;
    }
    .retry-btn:hover { background: var(--accent-hover); }
    .retry-btn:active { transform: scale(0.98); }
    .retry-btn:focus {
      outline: none;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus) 30%, transparent);
    }
    .retry-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .sr-only {
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
    @media (min-width: 480px) {
      .controls { flex-direction: row; align-items: flex-end; }
      .control-group { flex: 1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Coach-reviewed Feedback</h1>
      <span class="preview-badge">Fictional Preview</span>
    </header>

    <div class="controls" role="region" aria-label="Feedback controls">
      <div class="control-group">
        <label for="child-select">Child</label>
        <select id="child-select" aria-describedby="child-desc">
          <option value="alex">Alex</option>
          <option value="jamie">Jamie</option>
          <option value="sam">Sam</option>
          <option value="taylor">Taylor</option>
        </select>
        <span id="child-desc" class="sr-only">Select a child to view their coach feedback</span>
      </div>
      <div class="control-group">
        <label for="scenario-select">Demo scenario</label>
        <select id="scenario-select" aria-describedby="scenario-desc">
          <option value="normal">Normal</option>
          <option value="slow">Slow (~600ms)</option>
          <option value="fail-once">Fail once</option>
        </select>
        <span id="scenario-desc" class="sr-only">Choose a demo scenario to simulate loading behavior</span>
      </div>
    </div>

    <section class="feedback-area" id="feedback-area">
      <ul class="feedback-list" id="feedback-list" role="list"></ul>
      <div class="status" id="status" role="status"></div>
      <div id="recovery"></div>
    </section>
  </div>

  <script>
    (() => {
      'use strict';

      // Fixture data
      const FIXTURES = {
        alex: {
          connected: true,
          active: true,
          feedback: [
            { coach: 'Coach Morgan', date: '22 Nov 2026', text: 'Practised a steady landing.' },
            { coach: 'Coach Morgan', date: '15 Nov 2026', text: 'Remembered the warm-up sequence.' }
          ]
        },
        jamie: {
          connected: true,
          active: true,
          feedback: [
            { coach: 'Coach Morgan', date: '20 Nov 2026', text: 'Took turns during the relay.' }
          ]
        },
        sam: {
          connected: true,
          active: true,
          feedback: []
        },
        taylor: {
          connected: false,
          active: false,
          feedback: []
        }
      };

      // State
      let currentChild = 'alex';
      let currentScenario = 'normal';
      let abortController = null;
      let failOnceTriggered = false;

      // DOM elements
      const childSelect = document.getElementById('child-select');
      const scenarioSelect = document.getElementById('scenario-select');
      const feedbackList = document.getElementById('feedback-list');
      const recovery = document.getElementById('recovery');
      const statusEl = document.getElementById('status');
      const feedbackArea = document.getElementById('feedback-area');

      // Copy constants
      const COPY = {
        loading: 'Loading feedback',
        empty: 'No reviewed feedback yet',
        inactive: 'Feedback connection inactive',
        offline: "You’re offline. Reconnect and retry",
        error: "Couldn’t load feedback"
      };

      function setStatus(message, className = '') {
        recovery.replaceChildren();
        statusEl.textContent = message;
        statusEl.className = 'status' + (className ? ' ' + className : '');
        feedbackList.replaceChildren();
      }

      function renderFeedback(feedback) {
        recovery.replaceChildren();
        statusEl.textContent = '';
        statusEl.className = 'status';
        for (const item of feedback) {
          const listItem = document.createElement('li');
          const card = document.createElement('article');
          card.className = 'feedback-item';
          const meta = document.createElement('div');
          meta.className = 'feedback-meta';
          const coach = document.createElement('span');
          coach.className = 'feedback-coach';
          coach.textContent = item.coach;
          const date = document.createElement('time');
          date.className = 'feedback-date';
          date.dateTime = parseDate(item.date);
          date.textContent = item.date;
          const note = document.createElement('p');
          note.className = 'feedback-text';
          note.textContent = item.text;
          meta.append(coach, date);
          card.append(meta, note);
          listItem.append(card);
          feedbackList.append(listItem);
        }
      }

      function parseDate(str) {
        // Convert "22 Nov 2026" to "2026-11-22" for datetime attribute
        const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const [day, mon, year] = str.split(' ');
        return `${year}-${months[mon]}-${day.padStart(2, '0')}`;
      }

      function showRetryButton(onRetry) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'retry-btn';
        btn.textContent = 'Retry';
        btn.addEventListener('click', () => {
          btn.remove();
          onRetry();
        });
        recovery.replaceChildren(btn);
      }

      function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      async function fetchFeedback(childId, scenario) {
        // Cancel any in-flight request
        if (abortController) {
          abortController.abort();
        }
        abortController = new AbortController();
        const signal = abortController.signal;

        // Check online state at request start
        if (!navigator.onLine) {
          abortController?.abort();
          setStatus(COPY.offline, 'offline');
          showRetryButton(() => fetchFeedback(currentChild, currentScenario));
          return;
        }

        setStatus(COPY.loading, 'loading');
        feedbackArea.classList.add('loading');

        try {
          // Simulate network delay based on scenario
          if (scenario === 'slow') {
            await delay(600);
          } else if (scenario === 'fail-once' && !failOnceTriggered) {
            failOnceTriggered = true;
            await delay(300);
            if (signal.aborted) return;
            setStatus(COPY.error, 'error');
            showRetryButton(() => fetchFeedback(currentChild, currentScenario));
            return;
          }

          // Check if aborted (selection changed)
          if (signal.aborted) return;

          const fixture = FIXTURES[childId];

          // Handle inactive connection
          if (!fixture.connected || !fixture.active) {
            setStatus(COPY.inactive, 'inactive');
            feedbackArea.classList.remove('loading');
            return;
          }

          // Handle empty feedback
          if (fixture.feedback.length === 0) {
            setStatus(COPY.empty, 'empty');
            feedbackArea.classList.remove('loading');
            return;
          }

          // Render feedback (newest first - already sorted in fixtures)
          renderFeedback(fixture.feedback);
          feedbackArea.classList.remove('loading');

        } finally {
          if (!signal.aborted) feedbackArea.classList.remove('loading');
        }
      }

      function handleChildChange() {
        currentChild = childSelect.value;
        // Reset fail-once state when child changes
        if (currentScenario === 'fail-once') {
          failOnceTriggered = false;
        }
        fetchFeedback(currentChild, currentScenario);
      }

      function handleScenarioChange() {
        currentScenario = scenarioSelect.value;
        // Reset fail-once state when scenario changes to fail-once
        if (currentScenario === 'fail-once') {
          failOnceTriggered = false;
        }
        if (currentScenario !== 'slow') fetchFeedback(currentChild, currentScenario);
      }

      // Online/offline handling
      function handleOnline() {
        // If we're showing offline status, retry
        if (statusEl.classList.contains('offline')) {
          fetchFeedback(currentChild, currentScenario);
        }
      }

      function handleOffline() {
        // Only show offline if we're currently loading or about to load
        if (statusEl.classList.contains('loading') || feedbackArea.classList.contains('loading')) {
          abortController?.abort();
          setStatus(COPY.offline, 'offline');
          showRetryButton(() => fetchFeedback(currentChild, currentScenario));
          feedbackArea.classList.remove('loading');
        }
      }

      // Event listeners
      childSelect.addEventListener('change', handleChildChange);
      scenarioSelect.addEventListener('change', handleScenarioChange);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Initialize
      childSelect.value = currentChild;
      scenarioSelect.value = currentScenario;
      fetchFeedback(currentChild, currentScenario);
    })();
  </script>
</body>
</html>
