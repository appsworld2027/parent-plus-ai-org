from dataclasses import asdict
import sqlite3

from pilot.contracts import DeliveryStatus, ReminderRequest
from pilot.team_a.reminders import LocalReminderAdapter


def validate_adapter(database_path) -> dict:
    adapter = LocalReminderAdapter(lambda: sqlite3.connect(database_path))
    first = adapter.deliver(ReminderRequest("pilot-1", "Synthetic reminder"))
    retry = adapter.deliver(ReminderRequest("pilot-1", "Synthetic reminder"))
    with sqlite3.connect(database_path) as db:
        rows = db.execute("SELECT id, title FROM reminder ORDER BY id").fetchall()
    return {
        "first": asdict(first),
        "retry": asdict(retry),
        "rows": rows,
        "passed": (
            first.status == DeliveryStatus.CREATED
            and retry.status == DeliveryStatus.ALREADY_EXISTS
            and rows == [("pilot-1", "Synthetic reminder")]
        ),
    }
