"""Fill only enclosed transparent pinholes inside selected companion sprites.

Exterior transparency (including the intended gap between the legs) is preserved.
The script flood-fills transparency from the canvas boundary, so only transparent
pixels completely enclosed by the character artwork are repaired.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TARGETS = (
    ROOT / "web/public/assets/characters/companions/foodie/bear-neutral.png",
    ROOT / "web/public/assets/characters/companions/shopper/raccoon-neutral.png",
)


def enclosed_transparency(alpha: np.ndarray) -> np.ndarray:
    transparent = alpha < 16
    height, width = transparent.shape
    exterior = np.zeros_like(transparent)
    queue: deque[tuple[int, int]] = deque()

    def add(y: int, x: int) -> None:
        if transparent[y, x] and not exterior[y, x]:
            exterior[y, x] = True
            queue.append((y, x))

    for x in range(width):
        add(0, x)
        add(height - 1, x)
    for y in range(height):
        add(y, 0)
        add(y, width - 1)

    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < height and 0 <= nx < width:
                add(ny, nx)

    return transparent & ~exterior


def nearest_artwork_colour(
    rgb: np.ndarray, alpha: np.ndarray, y: int, x: int
) -> np.ndarray:
    height, width = alpha.shape
    for radius in range(1, 25):
        y0, y1 = max(0, y - radius), min(height, y + radius + 1)
        x0, x1 = max(0, x - radius), min(width, x + radius + 1)
        solid = alpha[y0:y1, x0:x1] >= 245
        if solid.any():
            sy, sx = np.nonzero(solid)
            distances = (sy + y0 - y) ** 2 + (sx + x0 - x) ** 2
            nearest = int(np.argmin(distances))
            return rgb[y0 + sy[nearest], x0 + sx[nearest]].copy()
    raise RuntimeError(f"No opaque artwork found near ({x}, {y})")


def repair(path: Path) -> int:
    with Image.open(path) as source:
        pixels = np.array(source.convert("RGBA"))

    rgb = pixels[:, :, :3]
    alpha = pixels[:, :, 3]
    holes = enclosed_transparency(alpha)
    count = int(holes.sum())

    # Read colours from the untouched source arrays, then apply all fills at once.
    fills: list[tuple[int, int, np.ndarray]] = []
    for y, x in zip(*np.nonzero(holes)):
        fills.append((int(y), int(x), nearest_artwork_colour(rgb, alpha, int(y), int(x))))
    for y, x, colour in fills:
        rgb[y, x] = colour
        alpha[y, x] = 255

    temporary = path.with_name(f"{path.stem}.hole-fix.tmp.png")
    Image.fromarray(pixels, "RGBA").save(temporary, optimize=True)
    temporary.replace(path)
    return count


def main() -> None:
    for path in TARGETS:
        print(f"{path.name}: filled {repair(path)} enclosed transparent pixels")


if __name__ == "__main__":
    main()
