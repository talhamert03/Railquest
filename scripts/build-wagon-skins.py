"""Builds dist/assets/wagon-skins.webp from the carriage row of vehicles-v2.webp.

Each painted region (roof, body, chassis, brass trim, windows) is recoloured in
HLS space so the original shading, highlights and outlines are preserved.
Run: python3 scripts/build-wagon-skins.py  (needs Pillow)
"""
import colorsys, json, pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'dist/assets/vehicles-v2.webp'
OUT = ROOT / 'dist/assets/wagon-skins.webp'
# Carriage crops from renderer.js VEHICLES[4..7]: right-down, left-down, left-up, right-up.
CROPS = [(35, 586, 328, 338), (423, 586, 326, 340), (801, 583, 322, 344), (1189, 581, 320, 344)]
SCALE = 0.72
CELL_W, CELL_H = round(330 * SCALE), round(346 * SCALE)

# Mean colours of each region in the original art; recolouring is relative to these.
REFERENCE = {'roof': (196, 86, 62), 'body': (236, 220, 172), 'chassis': (22, 100, 92), 'brass': (190, 150, 70), 'window': (44, 64, 70)}

def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))

# Skin order is the in-game order (index 1..10 in cosmetics.js; 0 is the original art).
SKINS = [
    ('sakura', {'roof': '#f2a0bd', 'body': '#fff3f6', 'chassis': '#c95680', 'brass': '#e9c46a'}),
    ('midnight', {'roof': '#2d3c74', 'body': '#4a63b8', 'chassis': '#1b2140', 'brass': '#f2c45a', 'window': '#ffd86b'}),
    ('golden', {'roof': '#f0c04a', 'body': '#3a332d', 'chassis': '#191512', 'brass': '#ffd56a', 'window': '#ffe9a6'}),
    ('mint', {'roof': '#79d6bd', 'body': '#fbfff9', 'chassis': '#f08db0', 'brass': '#f2c45a'}),
    ('lemon', {'roof': '#ffd84a', 'body': '#fffbe6', 'chassis': '#58a9e0', 'brass': '#ffffff'}),
    ('lavender', {'roof': '#9b7ed6', 'body': '#efe6ff', 'chassis': '#5b3f99', 'brass': '#e9c46a'}),
    ('forest', {'roof': '#6aa84f', 'body': '#b98552', 'chassis': '#2f4f2a', 'brass': '#d9b35a'}),
    ('ocean', {'roof': '#2fb3c4', 'body': '#e9fbff', 'chassis': '#1d4f8c', 'brass': '#f2f2f2'}),
    ('frost', {'roof': '#eaf6ff', 'body': '#bfe3f7', 'chassis': '#8fa9bf', 'brass': '#ffffff'}),
    ('halloween', {'roof': '#5b2a86', 'body': '#f28a1e', 'chassis': '#1d1824', 'brass': '#9be35a', 'window': '#b6ff5c'}),
]

def classify(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    if l < 0.11:
        return None  # tyres, deep outlines
    if (deg < 28 or deg > 340) and s > 0.28:
        return 'roof'
    if 150 <= deg <= 215 and s >= 0.33:
        return 'chassis'
    if 150 <= deg <= 240 and l < 0.4:
        return 'window'
    if 25 <= deg <= 62:
        return 'brass' if s >= 0.42 and l < 0.6 else 'body'
    return None

def remap(r, g, b, region, target):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    rh, rl, rs = colorsys.rgb_to_hls(*(c / 255 for c in REFERENCE[region]))
    th, tl, ts = colorsys.rgb_to_hls(*(c / 255 for c in target))
    # Lightness keeps the painted shading: below the reference it scales, above it eases toward white.
    nl = tl * l / rl if l <= rl else tl + (1 - tl) * (l - rl) / max(1e-6, 1 - rl)
    ns = min(1, ts * (s / rs if rs > 0.05 else 1))
    if region == 'window' and tl > 0.5:
        # Lit windows: an even glow with a hint of the original reflections.
        nl = min(0.9, tl + 0.12 * (l / rl - 1))
    nr, ng, nb = colorsys.hls_to_rgb(th, max(0, min(1, nl)), ns)
    return round(nr * 255), round(ng * 255), round(nb * 255)

def regions(crop):
    """Per-pixel regions. Dark slate components touching the silhouette or chassis are tyres, not windows."""
    px = crop.load()
    W, H = crop.size
    grid = [[classify(*px[x, y][:3]) if px[x, y][3] else None for x in range(W)] for y in range(H)]
    seen = [[False] * W for _ in range(H)]
    for y0 in range(H):
        for x0 in range(W):
            if grid[y0][x0] != 'window' or seen[y0][x0]:
                continue
            stack, part, outside, chassis, edge = [(x0, y0)], [], 0, 0, 0
            seen[y0][x0] = True
            while stack:
                x, y = stack.pop()
                part.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if not (0 <= nx < W and 0 <= ny < H):
                        edge += 1
                        outside += 1
                        continue
                    k = grid[ny][nx]
                    if k == 'window':
                        if not seen[ny][nx]:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
                    elif k is not None or px[nx, ny][3] < 128:
                        # Dark outline pixels are neutral.
                        edge += 1
                        outside += px[nx, ny][3] < 128
                        chassis += k == 'chassis'
            # Tyres reach the sprite's silhouette and coupler shadows are small; panes are large and enclosed.
            if len(part) < 600 or outside:
                for x, y in part:
                    grid[y][x] = None
    return grid

def paint(crop, scheme):
    out = crop.copy()
    px = out.load()
    grid = regions(crop)
    targets = {k: hex_rgb(v) for k, v in scheme.items()}
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            region = grid[y][x]
            if a and region in targets:
                px[x, y] = (*remap(r, g, b, region, targets[region]), a)
    return out

def main():
    atlas = Image.open(SOURCE).convert('RGBA')
    sheet = Image.new('RGBA', (CELL_W * 4, CELL_H * len(SKINS)), (0, 0, 0, 0))
    rects = []
    for d, (x, y, w, h) in enumerate(CROPS):
        rects.append([d * CELL_W, 0, round(w * SCALE), round(h * SCALE)])
    for row, (name, scheme) in enumerate(SKINS):
        for d, (x, y, w, h) in enumerate(CROPS):
            art = paint(atlas.crop((x, y, x + w, y + h)), scheme).resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS)
            sheet.alpha_composite(art, (d * CELL_W, row * CELL_H))
        print('painted', name, file=sys.stderr)
    sheet.save(OUT, 'WEBP', quality=88, method=6)
    print(json.dumps({'cell': [CELL_W, CELL_H], 'rects': rects, 'skins': [n for n, _ in SKINS], 'size': sheet.size}))

if __name__ == '__main__':
    main()
