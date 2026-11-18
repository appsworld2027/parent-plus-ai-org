import json
from pathlib import Path
import sqlite3
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from demo.reminders import deliver, prepare
from org import CONFIG, ROOT, gate, report, run


class OrganizationTests(unittest.TestCase):
    def setUp(self):
        self.evidence = dict(commit="a", qa_commit="a", ci_commit="a", qa_pass=True,
                             ci_pass=True, conflict=True)

    def test_governance(self):
        decisions = {"Ankit": "A", "Manu": "A"}
        for pending in ({}, {"Ankit": "A"}, {"Ankit": "A", "Manu": "B"}):
            self.assertIn("refer to Ankit and Manu", gate(**self.evidence, decisions=pending))
        self.assertEqual(gate(**self.evidence, decisions=decisions), "ready for human merge")
        for override in ({"qa_pass": False}, {"ci_pass": False}, {"ci_commit": "old"},
                         {"qa_commit": "old"}):
            self.assertTrue(gate(**(self.evidence | override), decisions=decisions).startswith("blocked"))

    def test_synthetic_duplicate_delivery(self):
        with sqlite3.connect(":memory:") as db:
            prepare(db)
            deliver(db, "demo-1", "Reminder")
            deliver(db, "demo-1", "Reminder")
            self.assertEqual(db.execute("SELECT * FROM reminder").fetchall(),
                             [("demo-1", "Reminder")])

    def test_usage_reporting_and_daily_limit(self):
        event = json.dumps({"type": "turn.completed", "usage": {"input_tokens": 42}})
        with tempfile.TemporaryDirectory() as directory:
            ledger = Path(directory) / "usage.jsonl"
            brief = ROOT / "demo" / "brief.md"
            response = subprocess.CompletedProcess([], 0, stdout=event)
            with patch("org.subprocess.run", return_value=response) as runner:
                for _ in range(CONFIG["pilot"]["max_attempts_per_day"]):
                    self.assertEqual(run("A", "qa", brief, ledger), 0)
                with self.assertRaisesRegex(ValueError, "Daily"):
                    run("B", "qa", brief, ledger)
                self.assertEqual(runner.call_count, 6)
                self.assertIn("read-only", runner.call_args.args[0])
            self.assertEqual(report(ledger)["observed_tokens"], {"input_tokens": 252})
            self.assertEqual(report(ledger)["missing_usage"], 0)
