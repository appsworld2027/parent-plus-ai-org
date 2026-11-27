# Synthetic transport experiment — never merge

This is a bounded developer-trial experiment, not production inference. The
pinned Kiran edge case is unchanged. Rather than asking a limited model to emit
a large multi-file JSON envelope, the controller requests each exact file in a
separate bounded call: JSON object mode for the graph, text mode for handover.
The controller supplies only the predeclared paths and never edits model bytes.
A durable attempt and exact hash-bound receipt permit safe reuse and hold
ambiguous, invalid or incomplete responses. The unchanged deterministic gate
and distinct model review remain mandatory. Only the PR-open event runs
inference, not synchronization or reruns. No product files or real data.
