from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import sqlite3
import tempfile
import unittest

from pilot.contracts import (
    DeliveryStatus,
    InvalidReminder,
    ReminderConflict,
    ReminderRequest,
    ReminderStoreUnavailable,
)
from pilot.team_a.reminders import LocalReminderAdapter, prepare
from pilot.team_b.validator import validate_adapter


class PilotTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database = Path(self.directory.name) / "pilot.sqlite"
        with sqlite3.connect(self.database) as db:
            prepare(db)

    def adapter(self):
        return LocalReminderAdapter(
            lambda: sqlite3.connect(self.database, timeout=2),
            lock_attempts=3,
        )

    def test_create_exact_retry_and_conflict(self):
        adapter = self.adapter()
        request = ReminderRequest("one", "Reminder")
        self.assertEqual(adapter.deliver(request).status, DeliveryStatus.CREATED)
        self.assertEqual(
            adapter.deliver(request).status,
            DeliveryStatus.ALREADY_EXISTS,
        )
        with self.assertRaises(ReminderConflict):
            adapter.deliver(ReminderRequest("one", "Changed"))
        with sqlite3.connect(self.database) as db:
            self.assertEqual(
                db.execute("SELECT id, title FROM reminder").fetchall(),
                [("one", "Reminder")],
            )

    def test_invalid_values_never_write(self):
        adapter = self.adapter()
        for request in (
            ReminderRequest("", "Reminder"),
            ReminderRequest("one", "  "),
        ):
            with self.assertRaises(InvalidReminder):
                adapter.deliver(request)
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM reminder").fetchone()[0], 0)

    def test_concurrent_exact_retries_create_one_row(self):
        request = ReminderRequest("shared", "Concurrent")
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(lambda _: self.adapter().deliver(request).status, range(2)))
        self.assertCountEqual(
            statuses,
            [DeliveryStatus.CREATED, DeliveryStatus.ALREADY_EXISTS],
        )
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM reminder").fetchone()[0], 1)

    def test_concurrent_conflicting_requests_preserve_one_value(self):
        requests = (
            ReminderRequest("shared", "First"),
            ReminderRequest("shared", "Second"),
        )
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(self.adapter().deliver, request) for request in requests]
        outcomes = []
        for future in futures:
            try:
                outcomes.append(future.result().status)
            except ReminderConflict:
                outcomes.append("conflict")
        self.assertCountEqual(outcomes, [DeliveryStatus.CREATED, "conflict"])
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM reminder").fetchone()[0], 1)

    def test_persistent_lock_becomes_stable_store_error(self):
        lock = sqlite3.connect(self.database)
        self.addCleanup(lock.close)
        lock.execute("BEGIN IMMEDIATE")
        adapter = LocalReminderAdapter(
            lambda: sqlite3.connect(self.database, timeout=0),
            lock_attempts=2,
        )
        with self.assertRaisesRegex(ReminderStoreUnavailable, "storage is unavailable"):
            adapter.deliver(ReminderRequest("locked", "Cannot write"))
        lock.rollback()
        with sqlite3.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM reminder").fetchone()[0], 0)

    def test_prepare_is_repeatable_and_team_b_validates_public_contract(self):
        with sqlite3.connect(self.database) as db:
            prepare(db)
            prepare(db)
        self.assertTrue(validate_adapter(self.database)["passed"])
