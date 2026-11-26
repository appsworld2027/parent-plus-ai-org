Build a small in-memory booking waitlist for a fictional studio. When a spot opens, offer it to the oldest waiting person for that slot. Requests can be retried, people can cancel or rejoin, and one slot must not affect another. No dependencies.

Deliver exactly waitlist.mjs, exporting createWaitlist(). Each instance has join(slot, user), cancel(slot, user) and offer(slot). All IDs must be strings with at least one non-whitespace character. Invalid arguments throw TypeError without mutation. Join adds an entry at the back unless that user is currently queued for the same slot. Cancel removes the queued entry if one exists. Offer removes and returns the oldest queued user ID for the specified slot, or null. A cancelled user who rejoins goes to the back. Instances are independent.

Work in the supplied directory. Do not push, commit, or change the evaluation. End with a short handover explaining design choices, edge cases and remaining limitations.
