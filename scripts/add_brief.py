#!/usr/bin/env python3
"""Prepend or replace a daily brief in data/briefs.json and refresh embed JS.

Usage:
  python3 scripts/add_brief.py path/to/day.json
  python3 scripts/add_brief.py path/to/day.json --data data/briefs.json

Input may be a single brief object, or {"site":..., "briefs":[...]} / {"briefs":[...]}.
Dates must be unique; an existing date is replaced. New dates are inserted newest-first
(sorted by date descending after merge).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA = ROOT / "data" / "briefs.json"
DEFAULT_EMBED = ROOT / "data" / "briefs.embed.js"


def load_json(path: Path) -> dict | list:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def write_embed(data: dict, embed_path: Path) -> None:
    text = "window.BRIEFS_DATA = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    embed_path.write_text(text, encoding="utf-8")


def normalize_incoming(raw: dict | list) -> tuple[dict | None, list[dict]]:
    """Return (optional site update, list of brief objects)."""
    if isinstance(raw, list):
        return None, raw
    if not isinstance(raw, dict):
        raise ValueError("Input JSON must be an object or array of briefs")

    site = raw.get("site") if isinstance(raw.get("site"), dict) else None

    if "briefs" in raw:
        briefs = raw["briefs"]
        if not isinstance(briefs, list):
            raise ValueError("'briefs' must be an array")
        return site, briefs

    if "date" in raw and "stories" in raw:
        return site, [raw]

    raise ValueError(
        "Expected a brief object with 'date'+'stories', or a wrapper with 'briefs' array"
    )


def validate_brief(b: dict) -> None:
    if not isinstance(b, dict):
        raise ValueError("Each brief must be an object")
    if not b.get("date"):
        raise ValueError("Brief missing 'date'")
    if "stories" not in b or not isinstance(b["stories"], list):
        raise ValueError(f"Brief {b.get('date')}: 'stories' must be an array")


def merge(existing: dict, site: dict | None, new_briefs: list[dict]) -> dict:
    if "briefs" not in existing or not isinstance(existing["briefs"], list):
        existing["briefs"] = []
    if "site" not in existing or not isinstance(existing["site"], dict):
        existing["site"] = {
            "title": "News Honestly",
            "subtitle": "事实 · 双解读 · 分歧 · 综合",
        }

    if site:
        existing["site"].update(site)

    by_date: dict[str, dict] = {}
    for b in existing["briefs"]:
        validate_brief(b)
        by_date[b["date"]] = b

    for b in new_briefs:
        validate_brief(b)
        date = b["date"]
        if date in by_date:
            print(f"Replacing existing brief for {date}")
        else:
            print(f"Adding new brief for {date}")
        by_date[date] = b

    existing["briefs"] = sorted(by_date.values(), key=lambda x: x["date"], reverse=True)
    return existing


def main() -> int:
    parser = argparse.ArgumentParser(description="Add or replace a News Honestly daily brief")
    parser.add_argument("input", type=Path, help="Path to brief JSON file")
    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA,
        help=f"Path to briefs.json (default: {DEFAULT_DATA})",
    )
    parser.add_argument(
        "--embed",
        type=Path,
        default=DEFAULT_EMBED,
        help=f"Path to briefs.embed.js (default: {DEFAULT_EMBED})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print plan without writing",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        print(f"Error: input not found: {args.input}", file=sys.stderr)
        return 1

    raw = load_json(args.input)
    site, new_briefs = normalize_incoming(raw)
    if not new_briefs:
        print("Error: no briefs to add", file=sys.stderr)
        return 1

    for b in new_briefs:
        validate_brief(b)

    if args.data.is_file():
        existing = load_json(args.data)
        if not isinstance(existing, dict):
            print("Error: briefs.json must be an object", file=sys.stderr)
            return 1
    else:
        existing = {
            "site": {"title": "News Honestly", "subtitle": "事实 · 双解读 · 分歧 · 综合"},
            "briefs": [],
        }
        print(f"Creating new data file at {args.data}")

    dates_in = [b["date"] for b in new_briefs]
    if len(dates_in) != len(set(dates_in)):
        print("Error: duplicate dates in input file", file=sys.stderr)
        return 1

    merged = merge(existing, site, new_briefs)

    if args.dry_run:
        print("Dry run OK. Would write dates (newest first):")
        for b in merged["briefs"]:
            print(f"  - {b['date']} ({len(b.get('stories', []))} stories)")
        return 0

    args.data.parent.mkdir(parents=True, exist_ok=True)
    args.data.write_text(
        json.dumps(merged, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_embed(merged, args.embed)
    print(f"Wrote {args.data}")
    print(f"Wrote {args.embed}")
    print("Briefs now:")
    for b in merged["briefs"]:
        print(f"  - {b['date']} ({len(b.get('stories', []))} stories)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
