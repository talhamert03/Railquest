"""Builds dist/assets/wagon-skins.webp from the carriage row of vehicles-v2.webp.

Each skin repaints the original carriage region by region (roof, body, chassis, brass trim,
window panes) in HLS space so the painted shading and outlines survive, then paints a
pattern (dragon scales, galaxy stars, blossoms, candy stripes...) into a region, shaded by
the original lighting. Roof accessories and animated effects are drawn in-game
(dist/js/skin-effects.js).
Run: python3 scripts/build-wagon-skins.py  (needs Pillow)
"""
import colorsys, json, math, pathlib, random, sys
from PIL import Image, ImageDraw

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

# Order is the in-game order (rows 0..9, see dist/js/cosmetics.js).
SKINS = [
    {'id': 'dragon', 'colors': {'roof': '#1f5d3a', 'body': '#3fae5a', 'chassis': '#5a1f1f', 'brass': '#f2b43a', 'window': '#ffb347'},
     'patterns': [('body', 'scales', '#1f6b35', 0.85), ('roof', 'scales', '#13402a', 0.6)]},
    {'id': 'unicorn', 'colors': {'roof': '#f4b8e4', 'body': '#fff8ff', 'chassis': '#c9a7f5', 'brass': '#f7d36a'},
     'patterns': [('body', 'stars', '#e27fd0', 1.0)]},
    {'id': 'galaxy', 'colors': {'roof': '#1b1446', 'body': '#3a2a8c', 'chassis': '#120c2e', 'brass': '#9ff0ff', 'window': '#7ff6ff'},
     'gradient': ('body', '#5b2fb8', '#1f4fb5'), 'patterns': [('body', 'stars', '#ffffff', 1.0), ('roof', 'stars', '#d8c9ff', 0.8)]},
    {'id': 'halloween', 'colors': {'roof': '#5b2a86', 'body': '#f28a1e', 'chassis': '#1d1824', 'brass': '#9be35a', 'window': '#b6ff5c'},
     'patterns': [('body', 'bats', '#1d1226', 1.0), ('roof', 'stars', '#f7c35a', 0.8)]},
    {'id': 'icequeen', 'colors': {'roof': '#eaf7ff', 'body': '#9fd8f5', 'chassis': '#5f86b8', 'brass': '#ffffff', 'window': '#d9fbff'},
     'gradient': ('body', '#8cc8f2', '#4f86d6'), 'patterns': [('body', 'snowflakes', '#ffffff', 1.0), ('roof', 'snowflakes', '#9fd2f5', 0.8)]},
    {'id': 'sakura', 'colors': {'roof': '#f290b4', 'body': '#fff6f8', 'chassis': '#b34b74', 'brass': '#f2c45a'},
     'patterns': [('body', 'blossoms', '#ec5f95', 1.0), ('roof', 'blossoms', '#fff0f5', 0.9)]},
    {'id': 'mermaid', 'colors': {'roof': '#1aa6a6', 'body': '#46d1c3', 'chassis': '#244e8c', 'brass': '#ffe08a'},
     'gradient': ('body', '#58e0c9', '#5a8fe6'), 'patterns': [('body', 'scales', '#e9fffb', 0.85), ('roof', 'dots', '#bff7ef', 0.7)]},
    {'id': 'royal', 'colors': {'roof': '#7a1430', 'body': '#2b2420', 'chassis': '#14100d', 'brass': '#ffd25a', 'window': '#ffe9a6'},
     'patterns': [('body', 'diamonds', '#ffcf4d', 1.0), ('roof', 'diamonds', '#f2c45a', 0.8)]},
    {'id': 'candy', 'colors': {'roof': '#fff7fb', 'body': '#ffc2dc', 'chassis': '#62c9b4', 'brass': '#ffffff'},
     'patterns': [('body', 'stripes', '#ff7fb0', 0.9), ('roof', 'sprinkles', None, 1.0)]},
    {'id': 'firefly', 'colors': {'roof': '#4e8b3a', 'body': '#c08a52', 'chassis': '#3a2b1c', 'brass': '#d8c46a', 'window': '#fff1a1'},
     'patterns': [('body', 'leaves', '#3f8f32', 1.0), ('roof', 'leaves', '#2f6b28', 0.8)]},
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
    """Per-pixel regions. Dark slate components touching the silhouette are tyres; small ones are coupler shadows."""
    px = crop.load()
    W, H = crop.size
    grid = [[classify(*px[x, y][:3]) if px[x, y][3] else None for x in range(W)] for y in range(H)]
    seen = [[False] * W for _ in range(H)]
    for y0 in range(H):
        for x0 in range(W):
            if grid[y0][x0] != 'window' or seen[y0][x0]:
                continue
            stack, part, outside = [(x0, y0)], [], 0
            seen[y0][x0] = True
            while stack:
                x, y = stack.pop()
                part.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if not (0 <= nx < W and 0 <= ny < H) or px[nx, ny][3] < 128:
                        outside += 1
                    elif grid[ny][nx] == 'window' and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            # Tyres reach the sprite's silhouette and coupler shadows are small; panes are large and enclosed.
            if len(part) < 600 or outside:
                for x, y in part:
                    grid[y][x] = None
    return grid

def stamp_layer(kind, color, size, seed):
    """Pattern drawn at 2x for anti-aliasing, returned at crop size."""
    W, H = size
    k = 2
    layer = Image.new('RGBA', (W * k, H * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rnd = random.Random(seed)
    c = hex_rgb(color) + (255,) if color else None
    if kind == 'scales':
        r = 15 * k
        for row, y in enumerate(range(0, H * k + r, int(r * 0.9))):
            for x in range(-r, W * k + r, 2 * r):
                cx = x + (r if row % 2 else 0)
                d.arc((cx - r, y - r, cx + r, y + r), 20, 160, fill=c, width=4 * k)
    elif kind == 'stars':
        for _ in range(int(W * H / 260)):
            x, y, s = rnd.uniform(0, W * k), rnd.uniform(0, H * k), rnd.uniform(2.5, 6.5) * k
            d.polygon([(x, y - s), (x + s * 0.28, y - s * 0.28), (x + s, y), (x + s * 0.28, y + s * 0.28), (x, y + s), (x - s * 0.28, y + s * 0.28), (x - s, y), (x - s * 0.28, y - s * 0.28)], fill=c)
    elif kind == 'dots':
        step = 15 * k
        for row, y in enumerate(range(0, H * k, step)):
            for x in range((row % 2) * step // 2, W * k, step):
                r = 2.6 * k
                d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    elif kind == 'blossoms':
        step = 36 * k
        for row, y in enumerate(range(8 * k, H * k, step)):
            for x in range((row % 2) * step // 2, W * k, step):
                x2, y2, r = x + rnd.uniform(-5, 5) * k, y + rnd.uniform(-5, 5) * k, 6.5 * k
                for i in range(5):
                    a = i * math.tau / 5 + rnd.random()
                    px_, py_ = x2 + math.cos(a) * r, y2 + math.sin(a) * r
                    d.ellipse((px_ - r * 0.8, py_ - r * 0.8, px_ + r * 0.8, py_ + r * 0.8), fill=c)
                d.ellipse((x2 - r * 0.45, y2 - r * 0.45, x2 + r * 0.45, y2 + r * 0.45), fill=(255, 226, 120, 255))
    elif kind == 'snowflakes':
        step = 40 * k
        for row, y in enumerate(range(10 * k, H * k, step)):
            for x in range((row % 2) * step // 2, W * k, step):
                s = rnd.uniform(9, 12) * k
                for i in range(3):
                    a = i * math.pi / 3
                    d.line((x - math.cos(a) * s, y - math.sin(a) * s, x + math.cos(a) * s, y + math.sin(a) * s), fill=c, width=int(2.6 * k))
                d.ellipse((x - 1.6 * k, y - 1.6 * k, x + 1.6 * k, y + 1.6 * k), fill=c)
    elif kind == 'bats':
        step = 40 * k
        for row, y in enumerate(range(14 * k, H * k, int(step * 0.8))):
            for x in range((row % 2) * step // 2, W * k, step):
                s = 10 * k
                d.polygon([(x, y - s * 0.2), (x - s * 0.5, y - s * 0.7), (x - s * 1.4, y - s * 0.5), (x - s * 1.1, y), (x - s * 0.7, y - s * 0.1), (x - s * 0.4, y + s * 0.3),
                           (x, y + s * 0.1), (x + s * 0.4, y + s * 0.3), (x + s * 0.7, y - s * 0.1), (x + s * 1.1, y), (x + s * 1.4, y - s * 0.5), (x + s * 0.5, y - s * 0.7)], fill=c)
    elif kind == 'diamonds':
        step = 28 * k
        for row, y in enumerate(range(0, H * k, step)):
            for x in range((row % 2) * step // 2, W * k, step):
                s = 7 * k
                d.polygon([(x, y - s), (x + s * 0.6, y), (x, y + s), (x - s * 0.6, y)], outline=c, width=int(2.2 * k))
                d.ellipse((x - 1.4 * k, y - 1.4 * k, x + 1.4 * k, y + 1.4 * k), fill=c)
    elif kind == 'stripes':
        step = 22 * k
        for x in range(0, W * k, step):
            d.rectangle((x, 0, x + step * 0.45, H * k), fill=c)
    elif kind == 'sprinkles':
        palette = [(255, 107, 157), (110, 207, 246), (255, 214, 74), (139, 225, 133), (186, 140, 255)]
        for _ in range(int(W * H / 140)):
            x, y, a = rnd.uniform(0, W * k), rnd.uniform(0, H * k), rnd.uniform(0, math.pi)
            s = 4.2 * k
            d.line((x - math.cos(a) * s, y - math.sin(a) * s, x + math.cos(a) * s, y + math.sin(a) * s), fill=rnd.choice(palette) + (255,), width=int(2.6 * k))
    elif kind == 'leaves':
        step = 30 * k
        for row, y in enumerate(range(8 * k, H * k, int(step * 0.75))):
            for x in range((row % 2) * step // 2, W * k, step):
                s = rnd.uniform(9, 11) * k
                leaf = Image.new('RGBA', (int(s * 2), int(s * 2)), (0, 0, 0, 0))
                ImageDraw.Draw(leaf).ellipse((s * 0.55, 0, s * 1.45, s * 2), fill=c)
                leaf = leaf.rotate(rnd.uniform(-60, 60), resample=Image.BICUBIC)
                layer.alpha_composite(leaf, (int(x - s), int(y - s)))
    return layer.resize((W, H), Image.LANCZOS)

def paint(crop, skin, seed):
    out = crop.copy()
    px = out.load()
    grid = regions(crop)
    W, H = out.size
    targets = {k: hex_rgb(v) for k, v in skin['colors'].items()}
    gradient = skin.get('gradient')
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            region = grid[y][x]
            if not a or region not in targets:
                continue
            target = targets[region]
            if gradient and region == gradient[0]:
                t = min(1, max(0, (x / W) * 0.6 + (y / H) * 0.4))
                c1, c2 = hex_rgb(gradient[1]), hex_rgb(gradient[2])
                target = tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
            if skin.get('rainbow') == region:
                hue = ((x + y * 0.6) / (W * 0.55)) % 1
                target = tuple(round(v * 255) for v in colorsys.hls_to_rgb(hue, 0.78, 0.85))
            px[x, y] = (*remap(r, g, b, region, target), a)
    # Patterns follow the original lighting: darker where the paint was in shadow.
    for index, (region, kind, color, strength) in enumerate(skin.get('patterns', [])):
        layer = stamp_layer(kind, color, (W, H), seed * 31 + index).load()
        ref_l = colorsys.rgb_to_hls(*(c / 255 for c in REFERENCE[region]))[1]
        src = crop.load()
        for y in range(H):
            for x in range(W):
                if grid[y][x] != region:
                    continue
                lr, lg, lb, la = layer[x, y]
                if not la:
                    continue
                l = colorsys.rgb_to_hls(*(c / 255 for c in src[x, y][:3]))[1]
                shade = max(0.55, min(1.2, l / ref_l))
                alpha = la / 255 * strength
                r, g, b, a = px[x, y]
                px[x, y] = (round(r + (min(255, lr * shade) - r) * alpha), round(g + (min(255, lg * shade) - g) * alpha), round(b + (min(255, lb * shade) - b) * alpha), a)
    return out

def main():
    atlas = Image.open(SOURCE).convert('RGBA')
    sheet = Image.new('RGBA', (CELL_W * 4, CELL_H * len(SKINS)), (0, 0, 0, 0))
    rects = [[d * CELL_W, 0, round(w * SCALE), round(h * SCALE)] for d, (x, y, w, h) in enumerate(CROPS)]
    for row, skin in enumerate(SKINS):
        for d, (x, y, w, h) in enumerate(CROPS):
            art = paint(atlas.crop((x, y, x + w, y + h)), skin, row * 4 + d).resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS)
            sheet.alpha_composite(art, (d * CELL_W, row * CELL_H))
        print('painted', skin['id'], file=sys.stderr)
    sheet.save(OUT, 'WEBP', quality=88, method=6)
    print(json.dumps({'cell': [CELL_W, CELL_H], 'rects': rects, 'skins': [s['id'] for s in SKINS], 'size': sheet.size}))

if __name__ == '__main__':
    main()
