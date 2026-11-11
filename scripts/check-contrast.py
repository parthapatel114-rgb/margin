"""Measure declared semantic token pairs; does not audit arbitrary custom colors."""
import json
import re
import sys
from pathlib import Path


def luminance(color):
    color = color.lstrip("#")
    if len(color) == 3:
        color = "".join(channel * 2 for channel in color)
    rgb = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    return sum(weight * value for weight, value in zip((0.2126, 0.7152, 0.0722), linear))


def contrast(first, second):
    low, high = sorted((luminance(first), luminance(second)))
    return (high + 0.05) / (low + 0.05)


rows = []
css = Path("src/themes.css").read_text()
for name, block in re.findall(r'\[data-theme="(\w+)"\]\s*\{([^}]+)\}', css):
    tokens = dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]+)", block))
    tests = [(fg, bg, 4.5) for fg in ("text", "muted", "danger") for bg in ("bg", "surface", "raised", "hover")]
    tests += [("control-border", bg, 3) for bg in ("bg", "surface", "raised", "hover")]
    tests += [(fg, bg, 3) for fg in ("accent", "secondary", "chart") for bg in ("bg", "surface", "raised", "hover")]
    tests += [("accent-text", "accent", 4.5), ("danger-text", "danger", 4.5)]
    for foreground, background, minimum in tests:
        ratio = contrast(tokens[foreground], tokens[background])
        rows.append(dict(theme=name, pair=f"{foreground}/{background}", ratio=round(ratio, 2), minimum=minimum, passed=ratio >= minimum))
if len(rows) != 180:
    sys.exit("Expected six themes and 180 semantic pairs; inspect the theme definitions.")
Path("work").mkdir(exist_ok=True)
Path("work/contrast-results.json").write_text(json.dumps(rows, indent=2) + "\n")
failed = [row for row in rows if not row["passed"]]
for row in failed:
    print(row)
print(f"Measured {len(rows)} pairs; {len(failed)} failures")
sys.exit(bool(failed))
