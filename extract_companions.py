from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SRC = ROOT / "stone.png"
OUT_DIR = ROOT / "assets" / "companions"

# Crop boxes (x1, y1, x2, y2) tuned for 1024x768 source.
CROPS: dict[str, tuple[int, int, int, int]] = {
    "petals": (0, 0, 420, 260),
    "cactus": (330, 150, 690, 460),
    "stones": (540, 420, 1024, 768),
}


def bg_color_estimate(rgba_img: Image.Image) -> tuple[float, float, float]:
    w, h = rgba_img.size
    pts = []
    for x, y in [
        (6, 6),
        (w - 7, 6),
        (6, h - 7),
        (w - 7, h - 7),
        (w // 2, 6),
        (w // 2, h - 7),
    ]:
        pts.append(rgba_img.getpixel((x, y))[:3])
    r = sum(p[0] for p in pts) / len(pts)
    g = sum(p[1] for p in pts) / len(pts)
    b = sum(p[2] for p in pts) / len(pts)
    return (r, g, b)


def make_alpha(img_rgba: Image.Image) -> Image.Image:
    """
    Remove paper background via a simple chroma-key style rule:
    - Pixels that are very bright and low saturation -> transparent
    - A soft ramp for near-background pixels to avoid harsh edges
    This is robust to paper stains and uneven lighting.
    """
    w, h = img_rgba.size
    out = img_rgba.copy()
    px = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue

            rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
            mx = max(rf, gf, bf)
            mn = min(rf, gf, bf)
            v = mx
            s = 0.0 if mx == 0 else (mx - mn) / mx

            # Strong background (paper)
            if v >= 0.86 and s <= 0.26:
                px[x, y] = (r, g, b, 0)
                continue

            # Soft edge ramp
            if v >= 0.78 and s <= 0.34:
                # map v from [0.78..0.86] to alpha [255..0]
                t = (0.86 - v) / (0.86 - 0.78)
                alpha = int(max(0, min(255, 255 * t)))
                px[x, y] = (r, g, b, min(a, alpha))

    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
    return out


def main() -> None:
    if not SRC.exists():
        raise FileNotFoundError(str(SRC))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert("RGBA")

    for name, box in CROPS.items():
        crop = im.crop(box)
        out = make_alpha(crop)
        out_path = OUT_DIR / f"{name}.png"
        out.save(out_path, optimize=True)
        print("saved", out_path, out.size)


if __name__ == "__main__":
    main()

