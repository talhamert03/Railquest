"""Builds the premium wagon liveries from the carriage row of vehicles-v2.webp.

Outputs
  dist/assets/wagon-skins.webp  painted carriages (10 rows x 4 directions)
  dist/assets/wagon-glow.webp   their emissive light (neon trim, lit windows, lava, stars) at half size, with a
                                pre-blurred halo so the game adds it with 'lighter' and no runtime blur
  dist/js/skin-glints.js        bright paint points where in-game sparkles appear

Each region of the original art (roof, body, chassis, brass trim, window panes) is repainted in HLS
space so the original toy shading survives. Materials add gloss (a sharper highlight roll-off) or a
metal response (reflection bands along the shading), so the finish reads as lacquer, gold or chrome
instead of flat colour. The moving sheen and twinkles are added in-game (dist/js/skin-effects.js),
clipped to the carriage silhouette.
Run: python3 scripts/build-wagon-skins.py  (needs Pillow)
"""
import colorsys, json, math, pathlib, random, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'dist/assets/vehicles-v2.webp'
OUT = ROOT / 'dist/assets/wagon-skins.webp'
GLOW = ROOT / 'dist/assets/wagon-glow.webp'
# Carriage crops from renderer.js VEHICLES[4..7]: right-down, left-down, left-up, right-up.
CROPS = [(35, 586, 328, 338), (423, 586, 326, 340), (801, 583, 322, 344), (1189, 581, 320, 344)]
SCALE = 0.72
CELL_W, CELL_H = round(330 * SCALE), round(346 * SCALE)

REFERENCE = {'roof': (196, 86, 62), 'body': (236, 220, 172), 'chassis': (22, 100, 92), 'brass': (190, 150, 70), 'window': (44, 64, 70)}

def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))

# region: (colour, finish). Finishes: 'gloss' lacquer, 'metal' polished metal, 'matte'.
# glow: [(source, colour, strength)] where source is a region or a procedural pattern.
SKINS = [
    {'id': 'gold', 'regions': {'roof': ('#221c18', 'gloss'), 'body': ('#d9a228', 'metal'), 'chassis': ('#1c1714', 'gloss'), 'brass': ('#fff1b8', 'metal'), 'window': ('#ffe7a0', 'lit')},
     'glow': [('window', '#ffd66b', 0.9)]},
    {'id': 'neon', 'regions': {'roof': ('#141a33', 'gloss'), 'body': ('#1b2148', 'gloss'), 'chassis': ('#0b0f22', 'gloss'), 'brass': ('#4ff3ff', 'lit'), 'window': ('#b49bff', 'lit')},
     'lines': [('underline', '#5ff6ff'), ('roofline', '#ff6ad8')], 'glow': [('underline', '#2ef0ff', 1.0), ('roofline', '#ff4fd1', 1.0), ('brass', '#38f2ff', 0.7), ('window', '#9b7bff', 0.7)]},
    {'id': 'rosegold', 'regions': {'roof': ('#5a3036', 'gloss'), 'body': ('#d98c74', 'metal'), 'chassis': ('#6b3b3a', 'gloss'), 'brass': ('#fff3ea', 'metal'), 'window': ('#ffe3d6', 'lit')},
     'glow': [('window', '#ffd2bf', 0.6)]},
    {'id': 'lava', 'regions': {'roof': ('#2a2120', 'matte'), 'body': ('#3b2622', 'matte'), 'chassis': ('#171110', 'matte'), 'brass': ('#ff7a1a', 'lit'), 'window': ('#ff9a2e', 'lit')},
     'cracks': '#ffe08a', 'glow': [('cracks', '#ff5a00', 1.0), ('roofline', '#ff3d00', 0.55), ('brass', '#ff7a1a', 0.7), ('window', '#ff7a1a', 0.8)]},
    {'id': 'emerald', 'regions': {'roof': ('#0f3d2a', 'gloss'), 'body': ('#178a52', 'gloss'), 'chassis': ('#0b2a1d', 'gloss'), 'brass': ('#ffd977', 'metal'), 'window': ('#fff0b8', 'lit')},
     'lines': [('underline', '#ffd25a')], 'glow': [('window', '#ffe08a', 0.7)]},
    {'id': 'ruby', 'regions': {'roof': ('#2a0d14', 'gloss'), 'body': ('#c1122f', 'gloss'), 'chassis': ('#1a0a0e', 'gloss'), 'brass': ('#ffd25a', 'metal'), 'window': ('#ffe9b0', 'lit')},
     'lines': [('underline', '#ffd25a'), ('roofline', '#ffd25a')], 'glow': [('window', '#ffcf6b', 0.8)]},
    {'id': 'pearl', 'regions': {'roof': ('#f7f2ff', 'gloss'), 'body': ('#fbf7ff', 'pearl'), 'chassis': ('#8f78c4', 'gloss'), 'brass': ('#f1e6ff', 'metal'), 'window': ('#e9dcff', 'lit')},
     'lines': [('underline', '#d9c6ff')], 'glow': [('window', '#e2d2ff', 0.55)]},
    {'id': 'galaxy', 'regions': {'roof': ('#120d33', 'gloss'), 'body': ('#2d1f73', 'nebula'), 'chassis': ('#0a0820', 'gloss'), 'brass': ('#bfe9ff', 'metal'), 'window': ('#8ff6ff', 'lit')},
     'stars': '#ffffff', 'glow': [('stars', '#cfe8ff', 1.0), ('window', '#5be7ff', 0.8)]},
    {'id': 'frost', 'regions': {'roof': ('#f2fbff', 'gloss'), 'body': ('#86cdf2', 'gloss'), 'chassis': ('#4d7fb3', 'gloss'), 'brass': ('#ffffff', 'metal'), 'window': ('#d6fbff', 'lit')},
     'lines': [('roofline', '#e8fbff')], 'glow': [('window', '#a6f3ff', 0.75), ('roofline', '#c8f7ff', 0.6)]},
    {'id': 'halloween', 'regions': {'roof': ('#3d1a5c', 'gloss'), 'body': ('#f07a12', 'gloss'), 'chassis': ('#140f18', 'gloss'), 'brass': ('#9cff57', 'lit'), 'window': ('#b6ff5c', 'lit')},
     'lines': [('underline', '#b06bff')], 'glow': [('window', '#8dff3a', 1.0), ('underline', '#9b4dff', 0.8), ('brass', '#7dff3a', 0.6)]},
]

def classify(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    if l < 0.11:
        return None
    if (deg < 28 or deg > 340) and s > 0.28:
        return 'roof'
    if 150 <= deg <= 215 and s >= 0.33:
        return 'chassis'
    if 150 <= deg <= 240 and l < 0.4:
        return 'window'
    if 25 <= deg <= 62:
        return 'brass' if s >= 0.42 and l < 0.6 else 'body'
    return None

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
            if len(part) < 600 or outside:
                for x, y in part:
                    grid[y][x] = None
    return grid

def shade(l, rl, tl, finish, x, y, W, H):
    """Maps the original lightness l (region reference rl) to a new lightness around target tl."""
    rel = l / rl
    if finish == 'metal':
        return metal_input(rel, x, y, W, H)
    if finish == 'gloss':
        # Lacquer: rich mid tones and a crisp specular roll-off in the lit areas.
        v = tl * rel if rel <= 1 else tl + (1 - tl) * min(1, (rel - 1) * 2.4)
        return min(0.96, max(0.03, v))
    if finish == 'matte':
        return min(0.9, max(0.03, tl * (0.7 + 0.3 * rel)))
    return min(1, max(0, tl * rel if l <= rl else tl + (1 - tl) * (l - rl) / max(1e-6, 1 - rl)))

def metal_input(rel, x, y, W, H):
    # Polished metal: the form's shading plus reflection bands, read through a colour ramp below.
    # Two broad diagonal reflections across the body, like a studio light on a polished toy.
    band = 0.5 + 0.5 * math.sin((x / W * 1.7 - y / H * 0.9) * math.tau + rel * 2.2)
    return max(0, min(1, 0.42 * rel + 0.62 * band - 0.1))

def metal_ramp(t, th, tl, ts):
    # Highlights stay in the metal's own hue; only the very top of the ramp turns near white.
    stops = [(0, 0.08, ts), (0.4, tl * 0.78, ts), (0.68, min(0.78, tl + 0.14), ts), (0.88, min(0.88, tl + 0.3), ts * 0.9), (1, 0.95, ts * 0.6)]
    for (a, la, sa), (b, lb, sb) in zip(stops, stops[1:]):
        if t <= b:
            f = (t - a) / (b - a)
            return colorsys.hls_to_rgb(th, la + (lb - la) * f, sa + (sb - sa) * f)
    return colorsys.hls_to_rgb(th, 0.95, ts * 0.6)

def recolour(r, g, b, region, colour, finish, x, y, W, H):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    rh, rl, rs = colorsys.rgb_to_hls(*(c / 255 for c in REFERENCE[region]))
    th, tl, ts = colorsys.rgb_to_hls(*(c / 255 for c in colour))
    if finish == 'lit':
        # Self-lit parts: even, bright and saturated, with a hint of the original reflections.
        return tuple(round(v * 255) for v in colorsys.hls_to_rgb(th, min(0.8, tl * 0.92 + 0.1 * (l / rl - 1)), min(1, ts * 1.1)))
    if finish == 'pearl':
        # Mother of pearl: soft pink to lilac to ice-blue drift across the form, very light.
        t = (x / W) * 0.7 + (y / H) * 0.5 + (l / rl) * 0.4
        th = (0.86 + 0.18 * math.sin(t * 3.1)) % 1
        ts, tl = 0.55, 0.9
        return tuple(round(v * 255) for v in colorsys.hls_to_rgb(th, shade(l, rl, tl, 'gloss', x, y, W, H), ts))
    if finish == 'nebula':
        # Deep space: violet to blue to magenta clouds.
        t = math.sin(x / W * 5 + y / H * 3) * 0.5 + math.sin(x / W * 11 - y / H * 7) * 0.25
        th = (0.72 + 0.08 * t) % 1
        return tuple(round(v * 255) for v in colorsys.hls_to_rgb(th, shade(l, rl, 0.24 + 0.08 * t, 'gloss', x, y, W, H), 0.75))
    if finish == 'metal':
        return tuple(round(v * 255) for v in metal_ramp(metal_input(l / rl, x, y, W, H), th, tl, ts))
    ns = min(1, ts * (s / rs if rs > 0.05 else 1))
    return tuple(round(v * 255) for v in colorsys.hls_to_rgb(th, shade(l, rl, tl, finish, x, y, W, H), ns))

def crack_mask(W, H, seed):
    """Branching lava fissures across the body."""
    k = 2
    m = Image.new('L', (W * k, H * k), 0)
    d = ImageDraw.Draw(m)
    rnd = random.Random(seed)
    for _ in range(11):
        x, y, a = rnd.uniform(0, W * k), rnd.uniform(0, H * k), rnd.uniform(0, math.tau)
        width = 5 * k
        for _ in range(rnd.randint(8, 14)):
            a += rnd.uniform(-0.7, 0.7)
            nx, ny = x + math.cos(a) * 9 * k, y + math.sin(a) * 9 * k
            d.line((x, y, nx, ny), fill=255, width=max(1, int(width)))
            if rnd.random() < 0.25:
                b = a + rnd.choice((-1, 1)) * rnd.uniform(0.6, 1.2)
                d.line((nx, ny, nx + math.cos(b) * 12 * k, ny + math.sin(b) * 12 * k), fill=200, width=max(1, int(width * 0.6)))
            x, y, width = nx, ny, max(1.2 * k, width * 0.93)
    return m.resize((W, H), Image.LANCZOS)

def star_mask(W, H, seed):
    k = 2
    m = Image.new('L', (W * k, H * k), 0)
    d = ImageDraw.Draw(m)
    rnd = random.Random(seed)
    for _ in range(int(W * H / 240)):
        x, y = rnd.uniform(0, W * k), rnd.uniform(0, H * k)
        r = rnd.choice((0.9, 1.1, 1.4, 2.4)) * k
        d.ellipse((x - r, y - r, x + r, y + r), fill=255)
        if r > 2 * k:
            d.line((x - r * 2.6, y, x + r * 2.6, y), fill=200, width=k)
            d.line((x, y - r * 2.6, x, y + r * 2.6), fill=200, width=k)
    return m.resize((W, H), Image.LANCZOS)

def paint(crop, skin, seed):
    W, H = crop.size
    base = crop.copy()
    px = base.load()
    grid = regions(crop)
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            region = grid[y][x]
            if a and region in skin['regions']:
                colour, finish = skin['regions'][region]
                px[x, y] = (*recolour(r, g, b, region, hex_rgb(colour), finish, x, y, W, H), a)
    alpha = crop.getchannel('A')
    sources = {}
    for region in ('window', 'brass', 'body', 'roof'):
        m = Image.new('L', (W, H), 0)
        mp = m.load()
        for y in range(H):
            for x in range(W):
                if grid[y][x] == region:
                    mp[x, y] = 255
        sources[region] = m
    body = sources['body']
    # Livery lines follow the carriage's real edges: the roof edge and the bottom of the body above the chassis.
    near = lambda m, size: m.filter(ImageFilter.MaxFilter(size))
    chassis = Image.new('L', (W, H), 0)
    cp = chassis.load()
    for y in range(H):
        for x in range(W):
            if grid[y][x] == 'chassis':
                cp[x, y] = 255
    sources['underline'] = ImageChops.multiply(body, near(chassis, 7))
    sources['roofline'] = ImageChops.multiply(body, near(sources['roof'], 5))
    for source, colour in skin.get('lines', []):
        rgb = hex_rgb(colour)
        lp, mp = base.load(), sources[source].load()
        for y in range(H):
            for x in range(W):
                if mp[x, y] > 40:
                    r, g, b, a = lp[x, y]
                    l = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[1]
                    t = mp[x, y] / 255
                    lit = metal_ramp(min(1, 0.45 + l * 0.7), *colorsys.rgb_to_hls(*(c / 255 for c in rgb)))
                    lp[x, y] = tuple(round(lp[x, y][i] + (lit[i] * 255 - lp[x, y][i]) * t) for i in range(3)) + (a,)
    if 'cracks' in skin:
        cracks = ImageChops.multiply(crack_mask(W, H, seed), body)
        sources['cracks'] = cracks
        hot = Image.new('RGBA', (W, H), hex_rgb(skin['cracks']) + (255,))
        base.paste(hot, (0, 0), cracks)
    if 'stars' in skin:
        stars = ImageChops.multiply(star_mask(W, H, seed), ImageChops.lighter(body, sources['roof']))
        sources['stars'] = stars
        base.paste(Image.new('RGBA', (W, H), hex_rgb(skin['stars']) + (255,)), (0, 0), stars)
    # Emissive layer: a sharp core plus a soft halo. Window light stays on the carriage; neon, lava and
    # stars may bloom a few pixels past the edge, never into a fog around it.
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    inside = crop.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    bloom = inside.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2))
    for source, colour, strength in skin['glow']:
        mask = sources[source]
        rgb = hex_rgb(colour)
        soft = source == 'window'
        halo = mask.filter(ImageFilter.GaussianBlur(4 if soft else 6)).point(lambda v: min(255, int(v * (0.7 if soft else 1.5) * strength)))
        halo = ImageChops.multiply(halo, inside if soft else bloom)
        core = mask.point(lambda v: int(v * (0.15 if soft else 0.55) * strength))
        glow = Image.alpha_composite(glow, Image.merge('RGBA', (*[Image.new('L', (W, H), c) for c in rgb], halo)))
        glow = Image.alpha_composite(glow, Image.merge('RGBA', (*[Image.new('L', (W, H), c) for c in rgb], core)))
    del alpha
    return base, glow, glints(base, grid, seed)

def glints(base, grid, seed):
    """Where light catches the paint: up to 7 well-spaced bright points, normalised to the crop."""
    W, H = base.size
    px = base.load()
    cands = []
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            if grid[y][x] in ('body', 'roof', 'brass') and px[x, y][3] > 250:
                r, g, b, _ = px[x, y]
                cands.append((max(r, g, b) + min(r, g, b), x, y))
    cands.sort(reverse=True)
    picked = []
    for _, x, y in cands[:max(40, len(cands) // 12)]:
        if all((x - u) ** 2 + (y - v) ** 2 > (W * 0.14) ** 2 for u, v in picked):
            picked.append((x, y))
        if len(picked) == 7:
            break
    return [[round(x / W, 3), round(y / H, 3)] for x, y in picked]

def main():
    atlas = Image.open(SOURCE).convert('RGBA')
    sheet = Image.new('RGBA', (CELL_W * 4, CELL_H * len(SKINS)), (0, 0, 0, 0))
    glows = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    rects = [[d * CELL_W, 0, round(w * SCALE), round(h * SCALE)] for d, (x, y, w, h) in enumerate(CROPS)]
    points = {}
    for row, skin in enumerate(SKINS):
        for d, (x, y, w, h) in enumerate(CROPS):
            base, glow, spots = paint(atlas.crop((x, y, x + w, y + h)), skin, row * 4 + d)
            points.setdefault(skin['id'], []).append(spots)
            size = (round(w * SCALE), round(h * SCALE))
            sheet.alpha_composite(base.resize(size, Image.LANCZOS), (d * CELL_W, row * CELL_H))
            glows.alpha_composite(glow.resize(size, Image.LANCZOS), (d * CELL_W, row * CELL_H))
        print('painted', skin['id'], file=sys.stderr)
    sheet.save(OUT, 'WEBP', quality=90, method=6)
    # The glow is soft by nature; half resolution is enough and the game scales it back up.
    glows.resize((glows.width // 2, glows.height // 2), Image.LANCZOS).save(GLOW, 'WEBP', quality=85, method=6)
    (ROOT / 'dist/js/skin-glints.js').write_text('/** Generated by scripts/build-wagon-skins.py: bright paint points per skin and direction, normalised to the sprite. */\nexport const GLINTS=' + json.dumps(points, separators=(',', ':')) + ';\n', encoding='utf8')
    print(json.dumps({'cell': [CELL_W, CELL_H], 'rects': rects, 'skins': [s['id'] for s in SKINS], 'size': sheet.size}))

if __name__ == '__main__':
    main()
