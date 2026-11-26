Implement a single self-contained HTML document. Save it as waitlist.mjs (the existing workflow expects that filename; its content must be HTML). No remote dependencies or actions outside the file. This is an isolated, read-only Aurora Parent browser preview with fictional fixtures. Give it a polished, calm, responsive appearance, semantic controls, and visible keyboard focus. Explicitly label it as a fictional preview. No real identities or backend connections.

Integration surface: Select named "Child", default value alex, with options alex (Alex), jamie (Jamie), sam (Sam) and taylor (Taylor). Alex has two article elements in order, Coach Morgan, 22 Nov 2026, "Practised a steady landing."; Coach Morgan, 15 Nov 2026, "Remembered the warm-up sequence." Jamie has one, "Took turns during the relay." Sam is connected and empty, Taylor is inactive. No raw draft, other family data, or inactive child notes in source or payload. Use one accessible status message and a native Retry button. Select named "Demo scenario", with values normal, slow, fail-once. Changing to slow sets the mode for the next child selection; use a roughly 600ms delay. Choosing fail-once requests the current child's list and fails once with "Couldn’t load feedback", then Retry succeeds if online. Loading copy "Loading feedback", empty copy "No reviewed feedback yet", inactive copy "Feedback connection inactive", offline copy "You’re offline. Reconnect and retry". Read the browser's online state when requesting data. Immediately clear other feedback and cancel or ignore stale async work on selection changes. Use system fonts and no images.
# Feature Contract — Coach-reviewed feedback preview

Status: approved by the founder on 26 November 2026 in Codex (“Go ahead..”). Screen reference: proposed Aurora Parent feedback list.

| ID | Given | When | Then |
|---|---|---|---|
| AC-01 | A selected fictional child has an active verified connection and two approved notes | The guardian opens Feedback | The two approved notes appear newest first, with coach name, date and feedback text |
| AC-02 | The selected child has an approved note and a pending draft | The guardian opens Feedback | The approved note appears and the pending draft is absent |
| AC-03 | Two listed children have different approved notes | The guardian switches children | The feedback list contains only results for the newly selected child |
| AC-04 | An actively connected child has no approved notes | The guardian selects that child | “No reviewed feedback yet” appears |
| AC-05 | A child’s connection is inactive | The guardian selects that child | “Feedback connection inactive” appears and the list is empty |
| AC-06 | A selected child’s feedback is still loading | The guardian opens the list | “Loading feedback” appears without showing feedback from any previous selection |
| AC-07 | The selected child’s feedback could not be loaded | The guardian opens the list | A clear error and a “Retry” button appear |
| AC-08 | A previous load failed and the demo data is available again | The guardian selects “Retry” | The selected child’s reviewed feedback appears |
| AC-09 | The browser is offline when a feedback request starts | The guardian opens Feedback | “You’re offline. Reconnect and retry” appears without showing any child’s feedback |

The preview is read-only and uses simulated connections and failure states. Only synthetic, approved snapshots are eligible for delivery to the preview. Draft notes and unrelated child records must stay outside the delivered payload. This exercises the feature behavior with fixtures. Live authorization and integration require their own validation.

Engineering choices are delegated within the agreed scope. Any change to these behaviors after approval requires a recorded founder decision.

A previous fresh attempt failed at parse time because it hand-assembled HTML escaping. Use createElement, textContent, and append/replaceChildren to render feedback. Each card is an actual <article> inside a list item. Use one role="status" for status text alone, and keep the Retry button outside that live region. Copy the exact curly apostrophes in the two messages. Keep the last successfully rendered child notes visible when only the slow mode is selected; show loading and clear the old notes immediately upon the subsequent child change. Make error and offline status text separate from the Retry button. The independent runner will check script syntax and browser behavior.
