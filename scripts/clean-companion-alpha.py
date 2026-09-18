"""Remove pale background residue from companion PNGs without thickening outlines.

The generated companions already contain an alpha channel, but some sprites retain
opaque or semi-transparent off-white matte pixels outside the ink outline.  This
script removes only pale, low-chroma pixels connected to the transparent exterior,
then decontaminates remaining anti-aliased edge RGB from nearby opaque artwork.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
COMPANIONS = ROOT / "web/public/assets/characters/companions"
ACTIVE_SETS = ("foodie", "shopper", "subscriber")


def exterior_matte(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Find pale neutral matte pixels connected to the transparent exterior."""
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    candidate = (minimum >= 210) & ((maximum - minimum) <= 38) & (alpha > 0)
    transparent = alpha <= 4
    height, width = alpha.shape
    visited = np.zeros_like(candidate)
    queue: deque[tuple[int, int]] = deque()

    # Matte pixels must touch existing transparency. This avoids erasing light fur
    # and the white receipt enclosed by the character's dark ink outline.
    ys, xs = np.nonzero(candidate)
    for y, x in zip(ys.tolist(), xs.tolist()):
        y0, y1 = max(0, y - 1), min(height, y + 2)
        x0, x1 = max(0, x - 1), min(width, x + 2)
        if transparent[y0:y1, x0:x1].any():
            visited[y, x] = True
            queue.append((y, x))

    while queue:
        y, x = queue.popleft()
        for ny in range(max(0, y - 1), min(height, y + 2)):
            for nx in range(max(0, x - 1), min(width, x + 2)):
                if candidate[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))
    return visited


def decontaminate_edges(rgb: np.ndarray, alpha: np.ndarray) -> None:
    """Copy nearby solid artwork colour into semi-transparent edge pixels."""
    edge = (alpha > 4) & (alpha < 245)
    solid = alpha >= 245
    height, width = alpha.shape
    for y, x in zip(*np.nonzero(edge)):
        best: tuple[int, int] | None = None
        best_distance = 99
        for radius in range(1, 5):
            y0, y1 = max(0, y - radius), min(height, y + radius + 1)
            x0, x1 = max(0, x - radius), min(width, x + radius + 1)
            sy, sx = np.nonzero(solid[y0:y1, x0:x1])
            for local_y, local_x in zip(sy.tolist(), sx.tolist()):
                ny, nx = y0 + local_y, x0 + local_x
                distance = abs(ny - y) + abs(nx - x)
                if distance < best_distance:
                    best = (ny, nx)
                    best_distance = distance
            if best is not None:
                break
        if best is not None:
            rgb[y, x] = rgb[best]


def rebuild_antialiased_edge(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Rebuild a soft 1 px alpha edge around a binary, hard-cut silhouette."""
    filled = alpha >= 128
    extended = filled.copy()
    # Carry real edge colours a few pixels outward before feathering. Otherwise
    # transparent black RGB becomes a dark halo when the browser scales a sprite.
    for _ in range(3):
        sums = np.zeros_like(rgb, dtype=np.uint32)
        counts = np.zeros(alpha.shape, dtype=np.uint16)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                shifted_mask = np.roll(np.roll(extended, dy, axis=0), dx, axis=1)
                shifted_rgb = np.roll(np.roll(rgb, dy, axis=0), dx, axis=1)
                sums += shifted_rgb.astype(np.uint32) * shifted_mask[:, :, None]
                counts += shifted_mask.astype(np.uint16)
        grow = (~extended) & (counts > 0)
        rgb[grow] = (sums[grow] / counts[grow, None]).astype(np.uint8)
        extended |= grow

    mask_image = Image.fromarray((filled.astype(np.uint8) * 255), "L")
    return np.array(mask_image.filter(ImageFilter.GaussianBlur(radius=0.72)))


def keep_primary_component(rgb: np.ndarray, alpha: np.ndarray) -> int:
    """Remove detached checker/matte islands while retaining the main sprite."""
    mask = alpha >= 128
    height, width = mask.shape
    seen = np.zeros_like(mask)
    largest: list[tuple[int, int]] = []

    for start_y, start_x in zip(*np.nonzero(mask)):
        if seen[start_y, start_x]:
            continue
        component: list[tuple[int, int]] = []
        queue: deque[tuple[int, int]] = deque([(int(start_y), int(start_x))])
        seen[start_y, start_x] = True
        while queue:
            y, x = queue.popleft()
            component.append((y, x))
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    if mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        queue.append((ny, nx))
        if len(component) > len(largest):
            largest = component

    keep = np.zeros_like(mask)
    if largest:
        ys, xs = zip(*largest)
        keep[np.array(ys), np.array(xs)] = True
    removed = int((mask & ~keep).sum())
    alpha[~keep] = 0
    rgb[~keep] = 0
    return removed


def clean(path: Path) -> tuple[int, int]:
    with Image.open(path) as source:
        pixels = np.array(source.convert("RGBA"))
    rgb = pixels[:, :, :3]
    alpha = pixels[:, :, 3]

    matte = exterior_matte(rgb, alpha)
    removed = int(matte.sum())
    alpha[matte] = 0
    rgb[matte] = 0

    detached = keep_primary_component(rgb, alpha)

    edge_count = int(((alpha > 4) & (alpha < 245)).sum())
    decontaminate_edges(rgb, alpha)
    alpha = rebuild_antialiased_edge(rgb, alpha)

    pixels[:, :, :3] = rgb
    pixels[:, :, 3] = alpha
    temporary = path.with_name(f"{path.stem}.clean-tmp.png")
    Image.fromarray(pixels, "RGBA").save(temporary, optimize=True)
    temporary.replace(path)
    return removed + detached, edge_count


def main() -> None:
    for companion in ACTIVE_SETS:
        for path in sorted((COMPANIONS / companion).glob("*.png")):
            removed, edges = clean(path)
            print(f"{companion}/{path.name}: removed={removed}, defringed={edges}")


if __name__ == "__main__":
    main()
