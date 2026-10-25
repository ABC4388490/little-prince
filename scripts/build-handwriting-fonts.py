"""Build locally hosted pen fonts from the two OFL sources (requires fonttools[woff]).

Usage: python build-handwriting-fonts.py CHENYULUOYAN.ttf YSHI_WRITTEN_SC.ttf
Source outlines are preserved. Subset family names avoid reserved upstream names.
"""
from pathlib import Path
import hashlib
import json
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/fonts"
primary_path, supplement_path = map(Path, sys.argv[1:3])
primary_chars = set(TTFont(primary_path).getBestCmap())
supplement_chars = set(TTFont(supplement_path).getBestCmap()) - primary_chars
sources = ["index.html", "index-main.js", "story-cards.js", "api/chapters-data.js",
           "chat.js", "rose-chat.html", "log.html", "chat.html"]
ui_text = "".join((ROOT / name).read_text() for name in sources)
ui_chars = ({ord(c) for c in ui_text} | set(range(0x20, 0x100))) & primary_chars


def unicode_range(chars):
    spans = []
    start = end = None
    for point in sorted(chars):
        if end is not None and point == end + 1:
            end = point
            continue
        if start is not None:
            spans.append(f"U+{start:X}" + (f"-{end:X}" if end != start else ""))
        start = end = point
    if start is not None:
        spans.append(f"U+{start:X}" + (f"-{end:X}" if end != start else ""))
    return ",".join(spans)


def build(path, chars, filename, family):
    font = TTFont(path)
    options = subset.Options()
    # Upstream ChenYuluoyan hint programs fail in some rasterizers; outlines need no hints.
    options.hinting = False
    options.recalc_timestamp = False
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=chars)
    subsetter.subset(font)
    for record in font["name"].names:
        if record.nameID in (1, 4, 6, 16):
            value = family.replace(" ", "") if record.nameID == 6 else family
        elif record.nameID == 3:
            value = "B612-Pen-20261024;" + family
        elif record.nameID in (2, 17):
            value = "Regular"
        else:
            continue
        record.string = value.encode(record.getEncoding())
    font.flavor = "woff2"
    font.save(OUT / filename)
    return {"file": filename, "glyphs": len(chars), "bytes": (OUT / filename).stat().st_size}


rows = []
faces = []
jobs = [(primary_path, ui_chars, "b612-pen-ui-v1.woff2", "B612 Pen", "125%")]
# New chat text should not download a multi-megabyte font for one uncommon character.
remaining = sorted(primary_chars - ui_chars)
for offset in range(0, len(remaining), 512):
    jobs.append((primary_path, set(remaining[offset:offset + 512]),
                 f"b612-pen-cjk-{offset // 512:02d}-v1.woff2", "B612 Pen", "125%"))
jobs.append((supplement_path, supplement_chars, "b612-pen-sc-v1.woff2", "B612 Pen SC", "105%"))
for path, chars, filename, family, adjust in jobs:
    rows.append(build(path, chars, filename, family))
    faces.append('@font-face {\n  font-family: "B612 Pen";\n'
                 f'  src: url("assets/fonts/{filename}") format("woff2");\n'
                 '  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n'
                 + ('  size-adjust: ' + adjust + ';\n' if adjust else '')
                 + f'  unicode-range: {unicode_range(chars)};\n}}\n')
css = ROOT / "handwriting.css"
existing = css.read_text()
marker = "/* END B612 PEN FACES */\n"
if marker in existing:
    existing = existing.split(marker, 1)[1]
css.write_text('/* B612 Pen: OFL subsets of ChenYuluoyan 2.0 and YShi Written SC.\n'
               '   See assets/fonts/README.md and the bundled upstream licenses. */\n'
               + "".join(faces) + marker + existing)
required_cjk = {ord(c) for c in ui_text if 0x3400 <= ord(c) <= 0x9FFF}
fallback = required_cjk - primary_chars - supplement_chars
manifest = {
    "primary": {"url": "https://github.com/Chenyu-otf/chenyuluoyan_thin", "sha256": hashlib.sha256(primary_path.read_bytes()).hexdigest()},
    "supplement": {"url": "https://github.com/Steve-Yuu/YShi-Written", "sha256": hashlib.sha256(supplement_path.read_bytes()).hexdigest()},
    "fonts": rows,
    "static_cjk_characters": len(required_cjk),
    "xiaolai_fallback_characters": "".join(chr(c) for c in sorted(fallback)),
}
(OUT / "b612-pen-build.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(manifest, ensure_ascii=False, indent=2))
