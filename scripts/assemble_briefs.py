#!/usr/bin/env python3
"""Assemble data/briefs.json and data/briefs.embed.js from data/_parts/*.b64"""
import base64, zlib, json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parts_dir = root / "data" / "_parts"
manifest = json.loads((parts_dir / "manifest.json").read_text())
chunks = []
for i in range(manifest["parts"]):
    chunks.append((parts_dir / f"{i:02d}.b64").read_text().strip())
raw = zlib.decompress(base64.b64decode("".join(chunks)))
# validate
obj = json.loads(raw)
assert "briefs" in obj
text = raw.decode("utf-8")
if not text.endswith("\n"):
    text += "\n"
(root / "data" / "briefs.json").write_text(text, encoding="utf-8")
embed = "window.BRIEFS_DATA = " + text.rstrip("\n") + ";\n"
(root / "data" / "briefs.embed.js").write_text(embed, encoding="utf-8")
print("assembled", len(obj["briefs"]), "briefs,", len(text), "chars")
