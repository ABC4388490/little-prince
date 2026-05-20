# letter1.jpg -> letter1-cutout.png
# 透明背景 + 仅去掉散落星星；保留小王子、星球、玫瑰、围巾等
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "letter1.jpg"
OUT = ROOT / "letter1-cutout.png"


def main():
    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im, dtype=np.uint8)
    h, w, _ = a.shape
    R = a[:, :, 0].astype(np.float32)
    G = a[:, :, 1].astype(np.float32)
    B = a[:, :, 2].astype(np.float32)
    luma = 0.299 * R + 0.587 * G + 0.114 * B

    edge = np.concatenate(
        [a[0, :, :], a[-1, :, :], a[:, 0, :], a[:, -1, :]], axis=0
    )
    bg = np.median(edge.astype(np.float32), axis=0)
    diff = np.sqrt(((a.astype(np.float32) - bg) ** 2).sum(axis=2))
    mask_bg = (diff < 34) & (luma > 178)
    alpha = np.where(mask_bg, 0, 255).astype(np.uint8)

    yy = np.arange(h, dtype=np.int32)[:, None].repeat(w, axis=1)

    # 星星主要分布在画面上半的天空（星球弧线一般在再往下）
    sky = yy < int(h * 0.49)

    # 金黄色星星 / 很亮的浅黄白点（偏严格的浅色以防啄头发高光）
    yellowish = (
        (R > 172)
        & (G > 138)
        & (B < 228)
        & (R > B + 15)
        & ((R + G) > B + 55)
    )
    whitish = (luma > 212) & (R > 188) & (G > 185) & (B > 168)

    star_seed = sky & (yellowish | whitish) & (luma > 158)

    labeled, nlab = ndimage.label(star_seed)
    remove_star = np.zeros_like(star_seed, dtype=bool)
    for lab in range(1, nlab + 1):
        m = labeled == lab
        area = int(m.sum())
        if 6 <= area <= 1400:
            remove_star |= m

    remove_star = ndimage.binary_dilation(remove_star, iterations=2)
    alpha = np.where(remove_star, 0, alpha)

    rgba = np.dstack([a.astype(np.uint8), alpha])
    Image.fromarray(rgba, "RGBA").save(OUT, optimize=True)
    print("saved", OUT, (h, w))


if __name__ == "__main__":
    main()
