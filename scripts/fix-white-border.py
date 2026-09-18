"""Thicken black outer outline: paint bright pixels that touch the canvas black."""
from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

BASE = Path(r"c:\Users\Administrator\Desktop\SelectFood\SelectFood\web\public\assets\characters")
RADIUS = 3

TARGETS = [
    "outfits/scarf.png",
    "outfits/sweater.png",
    "outfits/raincoat.png",
    "states/dog-neutral-scarf.png",
    "states/dog-neutral-sweater.png",
    "states/dog-neutral-raincoat.png",
    "states/dog-eating-scarf.png",
    "states/dog-eating-sweater.png",
    "states/dog-eating-raincoat.png",
    "states/dog-chubby-scarf.png",
    "states/dog-chubby-sweater.png",
    "states/dog-chubby-raincoat.png",
    "states/dog-very-chubby-scarf.png",
    "states/dog-very-chubby-sweater.png",
    "states/dog-very-chubby-raincoat.png",
]


def canvas_bg(rgb: np.ndarray) -> np.ndarray:
    is_black = rgb.max(axis=2) <= 12
    h, w = is_black.shape
    vis = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def push(y: int, x: int) -> None:
        if is_black[y, x] and not vis[y, x]:
            vis[y, x] = True
            q.append((y, x))

    for y in range(h):
        push(y, 0)
        push(y, w - 1)
    for x in range(w):
        push(0, x)
        push(h - 1, x)
    while q:
        y, x = q.popleft()
        for ny in range(max(0, y - 1), min(h, y + 2)):
            for nx in range(max(0, x - 1), min(w, x + 2)):
                if not vis[ny, nx] and is_black[ny, nx]:
                    vis[ny, nx] = True
                    q.append((ny, nx))
    return vis


def dilate(mask: np.ndarray, r: int) -> np.ndarray:
    pad = np.pad(mask, r, constant_values=False)
    h, w = mask.shape
    out = np.zeros_like(mask)
    span = 2 * r + 1
    for dy in range(span):
        for dx in range(span):
            out |= pad[dy : dy + h, dx : dx + w]
    return out


def fix_file(path: Path) -> int:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    rgb = arr[:, :, :3]
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    mean = (r + g + b) / 3.0
    # keep saturated clothes (red scarf / blue coat) at the rim
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    is_vivid = chroma >= 45
    bg = canvas_bg(rgb)
    band = dilate(bg, RADIUS) & ~bg
    # bright near-neutral rim (white sticker OR cream edge looking white)
    rim = band & (mean >= 200) & ~is_vivid
    n = int(rim.sum())
    if n:
        rgb[rim] = 0
        arr[:, :, :3] = rgb
        Image.fromarray(arr, "RGBA").save(path)
    return n


def main() -> None:
    for rel in TARGETS:
        path = BASE / rel
        n = fix_file(path)
        print(f"{n:6d}  {rel}", flush=True)


if __name__ == "__main__":
    main()
