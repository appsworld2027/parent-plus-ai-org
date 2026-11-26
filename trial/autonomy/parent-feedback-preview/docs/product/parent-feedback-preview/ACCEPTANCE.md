# Feature Contract — Coach-reviewed feedback preview

Status: draft, awaiting founder approval. Screen reference: proposed Aurora Parent feedback list.

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
