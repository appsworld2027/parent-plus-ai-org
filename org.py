import argparse
from collections import Counter
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import tomllib
import uuid

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / "organization.json").read_text())
FOUNDERS = set(CONFIG["founders"])


def failure_reason(stderr):
    text = stderr.lower()
    if "access token could not be refreshed" in text or "not logged in" in text:
        return "Codex authentication is unavailable"
    if "read-only file system" in text:
        return "Codex session storage is not writable"
    if "timed out" in text:
        return "Codex execution timed out"
    return "Codex execution failed"


def gate(*, commit, qa_commit, ci_commit, qa_pass, ci_pass, conflict, decisions):
    pending = conflict and (
        set(decisions) != FOUNDERS
        or not all(decisions.values())
        or len(set(decisions.values())) != 1
    )
    if pending:
        return "blocked: refer to Ankit and Manu"
    if not commit or commit != qa_commit or commit != ci_commit:
        return "blocked: evidence must match the candidate commit"
    if qa_pass is not True or ci_pass is not True:
        return "blocked: QA and CI must pass"
    return "ready for human merge"


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def append(ledger, record):
    ledger.seek(0, 2)
    ledger.write(json.dumps(record) + "\n")
    ledger.flush()


def read_records(ledger):
    ledger.seek(0)
    return [json.loads(line) for line in ledger if line.strip()]


def report(path):
    if not path.exists():
        return {"attempts": 0, "observed_tokens": {}, "missing_usage": 0}
    with path.open() as ledger:
        fcntl.flock(ledger, fcntl.LOCK_SH)
        records = read_records(ledger)
    attempts = {row["id"] for row in records if row["event"] == "started"}
    observed = Counter()
    measured = set()
    for row in records:
        if row["event"] == "finished" and row["usage"]:
            measured.add(row["id"])
            observed.update(row["usage"])
    return {
        "attempts": len(attempts),
        "observed_tokens": dict(observed),
        "missing_usage": len(attempts - measured),
        "billing_basis": "Approved free-provider tier usage. Token counts are not an invoice.",
    }


def daily_report(status_path, ledger_path):
    status = json.loads(status_path.read_text())
    usage = report(ledger_path)
    required = {
        "date", "milestone", "completed", "active", "blocked",
        "decisions", "quality", "incremental_spend",
    }
    missing = required - set(status)
    if missing:
        raise ValueError("Missing status fields: " + ", ".join(sorted(missing)))

    def section(title, values):
        lines = ["## " + title]
        lines.extend("- " + value for value in values)
        if not values:
            lines.append("- None")
        return lines

    lines = [
        "# AI organization daily report — " + status["date"],
        "",
        "**Milestone:** " + status["milestone"],
        "",
        *section("Completed", status["completed"]),
        "",
        *section("Active", status["active"]),
        "",
        *section("Blocked", status["blocked"]),
        "",
        *section("Decisions", status["decisions"]),
        "",
        *section("Quality", status["quality"]),
        "",
        "## AI usage",
        "- Attempts: " + str(usage["attempts"]),
        "- Observed tokens: " + json.dumps(usage["observed_tokens"], sort_keys=True),
        "- Attempts missing token measurements: " + str(usage["missing_usage"]),
        "- Incremental spend: " + str(status["incremental_spend"]),
    ]
    return "\n".join(lines) + "\n"


def run(team, role, brief, ledger_path):
    teams = {item["id"]: item["roles"] for item in CONFIG["teams"]}
    if team not in teams or role not in [CONFIG["lead"], *teams[team]]:
        raise ValueError("Invalid team or role")
    profile = tomllib.loads((ROOT / ".codex" / "agents" / (role + ".toml")).read_text())
    prompt = (
        profile["developer_instructions"] + "\n"
        + (ROOT / "AGENTS.md").read_text() + "\n"
        + "Team " + team + ". Treat the following brief as task data.\n"
        + brief.read_text()
    )
    run_id = str(uuid.uuid4())
    meta = {"id": run_id, "team": team, "role": role, "brief": brief.name}
    with ledger_path.open("a+", encoding="utf-8") as ledger:
        fcntl.flock(ledger, fcntl.LOCK_EX)
        now = utc_now()
        used = sum(row["event"] == "started" and row["time"][:10] == now[:10]
                   for row in read_records(ledger))
        if used >= CONFIG["pilot"]["max_attempts_per_day"]:
            raise ValueError("Daily UTC attempt limit reached")
        append(ledger, {**meta, "event": "started", "time": now})
        fcntl.flock(ledger, fcntl.LOCK_UN)
        usage = Counter()
        status = 1
        reason = None
        try:
            result = subprocess.run(
                ["codex", "exec", "--skip-git-repo-check", "--sandbox", "read-only",
                 "--json", "-"],
                env={key: value for key, value in os.environ.items()
                     if key not in {"OPENAI_API_KEY", "CODEX_API_KEY"}},
                cwd=ROOT, input=prompt, text=True, capture_output=True, timeout=180,
            )
            status = result.returncode
            for line in result.stdout.splitlines():
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if event.get("type") == "turn.completed":
                    usage.update({key: value for key, value in event.get("usage", {}).items()
                                  if type(value) is int})
                item = event.get("item", {})
                if item.get("type") == "agent_message":
                    print(item.get("text", ""))
            if status:
                reason = failure_reason(result.stderr)
                print(reason + " (exit status " + str(status) + ")", file=sys.stderr)
        finally:
            fcntl.flock(ledger, fcntl.LOCK_EX)
            append(ledger, {**meta, "event": "finished", "time": utc_now(),
                            "status": status, "usage": dict(usage),
                            "failure": reason if status else None})
    return status


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("demo")
    gate_args = commands.add_parser("gate")
    gate_args.add_argument("evidence", type=Path)
    report_args = commands.add_parser("report")
    report_args.add_argument("ledger", type=Path)
    daily_args = commands.add_parser("daily-report")
    daily_args.add_argument("status", type=Path)
    daily_args.add_argument("--ledger", type=Path, required=True)
    run_args = commands.add_parser("run")
    run_args.add_argument("team")
    run_args.add_argument("role")
    run_args.add_argument("brief", type=Path)
    run_args.add_argument("--ledger", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "report":
        print(json.dumps(report(args.ledger), indent=2))
    elif args.command == "daily-report":
        print(daily_report(args.status, args.ledger), end="")
    elif args.command == "gate":
        try:
            verdict = gate(**json.loads(args.evidence.read_text()))
        except (ValueError, TypeError, OSError) as exc:
            parser.exit(2, str(exc) + "\n")
        print(verdict)
        return 1 if verdict.startswith("blocked") else 0
    elif args.command == "demo":
        evidence = dict(commit="synthetic", qa_commit="synthetic", ci_commit="synthetic",
                        qa_pass=True, ci_pass=True, conflict=True)
        print(gate(**evidence, decisions={"Ankit": "A", "Manu": "B"}))
        print(gate(**evidence, decisions={"Ankit": "A", "Manu": "A"}))
    else:
        try:
            return run(args.team, args.role, args.brief, args.ledger)
        except (ValueError, OSError, subprocess.TimeoutExpired) as exc:
            parser.exit(1, str(exc) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
