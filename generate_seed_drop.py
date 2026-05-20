import argparse
import math
import random
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFilter


@dataclass
class Stroke:
    color: tuple  # RGBA
    width: int
    jitter_px: float
    repeats: int


def _lerp(a, b, t):
    return a + (b - a) * t


def quad_bezier(p0, p1, p2, n=120):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        pts.append((x, y))
    return pts


def cubic_bezier(p0, p1, p2, p3, n=160):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (
            (1 - t) ** 3 * p0[0]
            + 3 * (1 - t) ** 2 * t * p1[0]
            + 3 * (1 - t) * t**2 * p2[0]
            + t**3 * p3[0]
        )
        y = (
            (1 - t) ** 3 * p0[1]
            + 3 * (1 - t) ** 2 * t * p1[1]
            + 3 * (1 - t) * t**2 * p2[1]
            + t**3 * p3[1]
        )
        pts.append((x, y))
    return pts


def jitter_points(points, amount):
    if amount <= 0:
        return points
    out = []
    for (x, y) in points:
        out.append((x + random.uniform(-amount, amount), y + random.uniform(-amount, amount)))
    return out


def draw_stroked_path(draw: ImageDraw.ImageDraw, points, stroke: Stroke, cap="round"):
    # Repeat with small random offsets to mimic hand-drawn watercolor pencil.
    for _ in range(stroke.repeats):
        dx = random.uniform(-stroke.jitter_px, stroke.jitter_px)
        dy = random.uniform(-stroke.jitter_px, stroke.jitter_px)
        pts = [(x + dx, y + dy) for (x, y) in points]
        draw.line(pts, fill=stroke.color, width=stroke.width, joint=cap)


def draw_seed_icon(img: Image.Image, center, scale=1.0):
    cx, cy = center
    draw = ImageDraw.Draw(img, "RGBA")

    brown = (118, 78, 56, 235)
    brown_soft = (118, 78, 56, 160)

    stroke_main = Stroke(color=brown, width=max(4, int(5 * scale)), jitter_px=0.8 * scale, repeats=3)
    stroke_soft = Stroke(color=brown_soft, width=max(3, int(4 * scale)), jitter_px=1.0 * scale, repeats=2)

    w = 120 * scale
    h = 160 * scale

    # Outer almond-like contour: two lobes meeting at bottom.
    top = (cx, cy - h * 0.45)
    left_ctrl1 = (cx - w * 0.42, cy - h * 0.22)
    left_ctrl2 = (cx - w * 0.36, cy + h * 0.18)
    bottom = (cx, cy + h * 0.46)
    right_ctrl2 = (cx + w * 0.36, cy + h * 0.18)
    right_ctrl1 = (cx + w * 0.42, cy - h * 0.22)

    left_curve = cubic_bezier(top, left_ctrl1, left_ctrl2, bottom)
    right_curve = cubic_bezier(bottom, right_ctrl2, right_ctrl1, top)
    outline = left_curve + right_curve

    draw_stroked_path(draw, jitter_points(outline, 0.35 * scale), stroke_soft)
    draw_stroked_path(draw, jitter_points(outline, 0.25 * scale), stroke_main)

    # Inner double line (slightly offset)
    inset = 6 * scale
    top2 = (cx + inset * 0.2, cy - h * 0.38)
    bottom2 = (cx + inset * 0.05, cy + h * 0.40)
    inner = quad_bezier(top2, (cx - w * 0.06, cy), bottom2)
    draw_stroked_path(draw, jitter_points(inner, 0.25 * scale), Stroke(color=brown, width=max(2, int(3 * scale)), jitter_px=0.6 * scale, repeats=2))

    # Three small dots on the right inner side
    dot_r = 3.2 * scale
    for i, yy in enumerate([cy - 8 * scale, cy + 8 * scale, cy + 24 * scale]):
        x = cx + w * 0.16 + random.uniform(-1.0, 1.0) * scale
        y = yy + random.uniform(-1.0, 1.0) * scale
        draw.ellipse((x - dot_r, y - dot_r, x + dot_r, y + dot_r), fill=(118, 78, 56, 210))


def draw_drop_icon(img: Image.Image, center, scale=1.0):
    cx, cy = center
    draw = ImageDraw.Draw(img, "RGBA")

    blue = (76, 150, 214, 225)
    blue_soft = (76, 150, 214, 150)

    stroke_main = Stroke(color=blue, width=max(4, int(5 * scale)), jitter_px=0.8 * scale, repeats=3)
    stroke_soft = Stroke(color=blue_soft, width=max(3, int(4 * scale)), jitter_px=1.0 * scale, repeats=2)

    w = 120 * scale
    h = 170 * scale

    top = (cx, cy - h * 0.46)
    left_ctrl1 = (cx - w * 0.34, cy - h * 0.10)
    left_ctrl2 = (cx - w * 0.46, cy + h * 0.18)
    bottom = (cx, cy + h * 0.46)
    right_ctrl2 = (cx + w * 0.46, cy + h * 0.18)
    right_ctrl1 = (cx + w * 0.34, cy - h * 0.10)

    left_curve = cubic_bezier(top, left_ctrl1, left_ctrl2, bottom)
    right_curve = cubic_bezier(bottom, right_ctrl2, right_ctrl1, top)
    outline = left_curve + right_curve

    draw_stroked_path(draw, jitter_points(outline, 0.35 * scale), stroke_soft)
    draw_stroked_path(draw, jitter_points(outline, 0.25 * scale), stroke_main)

    # Inner highlight arc
    arc = quad_bezier((cx + w * 0.10, cy + h * 0.10), (cx + w * 0.02, cy + h * 0.20), (cx - w * 0.08, cy + h * 0.16), n=80)
    draw_stroked_path(draw, jitter_points(arc, 0.2 * scale), Stroke(color=(76, 150, 214, 160), width=max(2, int(3 * scale)), jitter_px=0.5 * scale, repeats=2))


def add_paper_background(img: Image.Image):
    # Turn transparent canvas into a slightly textured paper.
    w, h = img.size
    base = Image.new("RGBA", (w, h), (246, 242, 234, 255))
    noise = Image.effect_noise((w, h), 18).convert("L")
    noise = noise.point(lambda p: int(p * 0.25))
    noise_rgba = Image.merge("RGBA", (noise, noise, noise, noise.point(lambda p: int(p * 0.22))))
    base = Image.alpha_composite(base, noise_rgba)
    return Image.alpha_composite(base, img)


def main():
    parser = argparse.ArgumentParser(description="Generate hand-drawn seed+drop PNG.")
    parser.add_argument("--out", default="seed-and-drop.png", help="output png filename")
    parser.add_argument("--w", type=int, default=1024)
    parser.add_argument("--h", type=int, default=512)
    parser.add_argument("--paper", action="store_true", help="render on paper background (non-transparent)")
    parser.add_argument("--seed", type=int, default=7, help="random seed for jitter")
    args = parser.parse_args()

    random.seed(args.seed)

    img = Image.new("RGBA", (args.w, args.h), (0, 0, 0, 0))

    # Layout: two icons centered horizontally with generous spacing.
    mid_y = args.h * 0.52
    seed_center = (args.w * 0.36, mid_y)
    drop_center = (args.w * 0.64, mid_y)

    # Slightly different scales to mimic the reference (seed a bit smaller).
    draw_seed_icon(img, seed_center, scale=1.05)
    draw_drop_icon(img, drop_center, scale=1.05)

    # Gentle blur + unsharp to mimic watercolor pencil bleeding.
    softened = img.filter(ImageFilter.GaussianBlur(radius=0.35))
    img = Image.alpha_composite(softened, img)

    if args.paper:
        img = add_paper_background(img)

    img.save(args.out, optimize=True)
    print(f"Saved: {args.out}")


if __name__ == "__main__":
    main()

