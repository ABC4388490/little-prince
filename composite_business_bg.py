"""
将商人插画合成到纸张背景上；可选仅保留中心人物区域。
依赖：Pillow。
"""
from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter


def feather_alpha(im: Image.Image, radius: float = 0.85) -> Image.Image:
    """轻微模糊 alpha，减轻抠图边缘锯齿与接缝感。"""
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    r, g, b, a = im.split()
    a = a.filter(ImageFilter.GaussianBlur(radius=radius))
    out = Image.merge("RGBA", (r, g, b, a))
    return out


def crop_man_only(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    """按边界框裁剪并保留 RGBA。"""
    return im.crop(box)


def composite_center(
    fg: Image.Image,
    bg: Image.Image,
    scale_max_w_ratio: float = 0.38,
    scale_max_h_ratio: float = 0.48,
) -> Image.Image:
    """将前景按比例缩放后水平垂直居中合成到背景。"""
    bg = bg.convert("RGBA")
    fg = fg.convert("RGBA")

    max_w = int(bg.width * scale_max_w_ratio)
    max_h = int(bg.height * scale_max_h_ratio)
    scale = min(max_w / fg.width, max_h / fg.height, 1.0)
    nw, nh = max(1, int(fg.width * scale)), max(1, int(fg.height * scale))
    fg_s = fg.resize((nw, nh), Image.Resampling.LANCZOS)
    fg_s = feather_alpha(fg_s, radius=0.75)

    x = (bg.width - nw) // 2
    y = (bg.height - nh) // 2
    out = bg.copy()
    out.alpha_composite(fg_s, (x, y))
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--bg",
        type=Path,
        default=Path(__file__).resolve().parent / "background.png",
    )
    parser.add_argument(
        "--fg",
        type=Path,
        default=Path(__file__).resolve().parent / "business-alpha.png",
    )
    parser.add_argument(
        "--out-full",
        type=Path,
        default=Path(__file__).resolve().parent / "business-on-background.png",
    )
    parser.add_argument(
        "--out-man",
        type=Path,
        default=Path(__file__).resolve().parent / "business-man-on-background.png",
    )
    args = parser.parse_args()

    bg = Image.open(args.bg)
    fg = Image.open(args.fg)

    # 全图合成（插画 + 底部文字；已去棋盘格）
    full = composite_center(fg, bg)
    full.save(args.out_full, optimize=True)

    # 仅中心人物区域：排除左侧飘纸、右侧流星、底部小行星与标题
    # 相对坐标（基于原始宽高的比例）
    w0, h0 = fg.size
    # 左,上,右,下 — 大致在「头部到胸部/椅背」，裁掉飘纸、流星、桌面与小行星、标题
    rel_box = (0.34, 0.11, 0.66, 0.42)
    MAN_BOX = (
        int(w0 * rel_box[0]),
        int(h0 * rel_box[1]),
        int(w0 * rel_box[2]),
        int(h0 * rel_box[3]),
    )
    man = crop_man_only(fg, MAN_BOX)
    man_feather = feather_alpha(man, radius=0.55)
    solo_out = Path(__file__).resolve().parent / "business-man-only.png"
    man_feather.save(solo_out, optimize=True)

    # 人物略小，允许在背景上稍大一点
    man_bg = composite_center(man_feather, bg, scale_max_w_ratio=0.22, scale_max_h_ratio=0.36)
    man_bg.save(args.out_man, optimize=True)

    print("已写出:", args.out_full.resolve())
    print("已写出:", solo_out.resolve())
    print("已写出:", args.out_man.resolve())


if __name__ == "__main__":
    main()
