import sqlite3
from typing import Callable

from pilot.contracts import (
    DeliveryResult,
    DeliveryStatus,
    InvalidReminder,
    ReminderConflict,
    ReminderRequest,
    ReminderStoreUnavailable,
)


def prepare(db: sqlite3.Connection) -> None:
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS reminder (
            id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
            title TEXT NOT NULL CHECK(length(trim(title)) > 0)
        )
        """
    )


class LocalReminderAdapter:
    def __init__(
        self,
        connect: Callable[[], sqlite3.Connection],
        *,
        lock_attempts: int = 3,
    ) -> None:
        if lock_attempts < 1:
            raise ValueError("lock_attempts must be at least one")
        self._connect = connect
        self._lock_attempts = lock_attempts

    def deliver(self, request: ReminderRequest) -> DeliveryResult:
        reminder_id = request.reminder_id.strip()
        title = request.title.strip()
        if not reminder_id or not title:
            raise InvalidReminder("Reminder ID and title are required")

        for attempt in range(self._lock_attempts):
            db = self._connect()
            try:
                db.execute("BEGIN IMMEDIATE")
                cursor = db.execute(
                    """
                    INSERT INTO reminder (id, title)
                    VALUES (?, ?)
                    ON CONFLICT(id) DO NOTHING
                    """,
                    (reminder_id, title),
                )
                created = cursor.rowcount == 1
                stored = db.execute(
                    "SELECT title FROM reminder WHERE id = ?",
                    (reminder_id,),
                ).fetchone()
                if stored is None:
                    raise ReminderStoreUnavailable("Reminder write was not observable")
                if stored[0] != title:
                    raise ReminderConflict("Reminder ID already has different content")
                db.commit()
                status = (
                    DeliveryStatus.CREATED
                    if created
                    else DeliveryStatus.ALREADY_EXISTS
                )
                return DeliveryResult(reminder_id=reminder_id, status=status)
            except ReminderConflict:
                db.rollback()
                raise
            except sqlite3.Error as exc:
                db.rollback()
                locked = "locked" in str(exc).lower() or "busy" in str(exc).lower()
                if locked and attempt + 1 < self._lock_attempts:
                    continue
                raise ReminderStoreUnavailable("Reminder storage is unavailable") from exc
            finally:
                db.close()

        raise ReminderStoreUnavailable("Reminder storage is unavailable")
