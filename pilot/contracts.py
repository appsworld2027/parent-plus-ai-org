from dataclasses import dataclass
from enum import StrEnum


@dataclass(frozen=True)
class ReminderRequest:
    reminder_id: str
    title: str


class DeliveryStatus(StrEnum):
    CREATED = "created"
    ALREADY_EXISTS = "already_exists"


@dataclass(frozen=True)
class DeliveryResult:
    reminder_id: str
    status: DeliveryStatus


class InvalidReminder(ValueError):
    pass


class ReminderConflict(RuntimeError):
    pass


class ReminderStoreUnavailable(RuntimeError):
    pass
