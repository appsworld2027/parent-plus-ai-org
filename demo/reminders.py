def prepare(db):
    db.execute("CREATE TABLE IF NOT EXISTS reminder (id TEXT PRIMARY KEY, title TEXT NOT NULL)")


def deliver(db, reminder_id, title):
    db.execute(
        "INSERT INTO reminder VALUES (?, ?) ON CONFLICT(id) DO NOTHING",
        (reminder_id, title),
    )
