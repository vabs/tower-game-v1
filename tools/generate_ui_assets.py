#!/usr/bin/env python3
"""Generate the modern-military pixel-art UI asset set in ./out/ui.

Requires Pillow 10. Artwork uses only integer-aligned shapes and nearest-neighbour
scaling. The only runtime dependency is Pillow.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "sprites" / "ui"
SHEET = ROOT / "art" / "ui_contact_sheet.png"
P = {
    "outline": "#202824", "deep": "#1D2322", "track": "#2B302C",
    "dark": "#303832", "olive_dark": "#3F4B36", "olive": "#556B4A",
    "green": "#6B7B5A", "green_hi": "#8E9B75", "steel": "#37474F",
    "steel_hi": "#607D8B", "tan_dark": "#7C6F57", "tan": "#C2B280",
    "tan_hi": "#D4C08A", "yellow": "#D5A33A", "red": "#B04040",
    "ground": "#50594A", "ground_hi": "#59614F", "road": "#414640",
    "road_hi": "#4A5048", "wood": "#756247", "wood_hi": "#947B55",
}


def rgba(name, alpha=255):
    v = P.get(name, name).lstrip("#")
    return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def canvas(w, h=None):
    return Image.new("RGBA", (w, h or w), (0, 0, 0, 0))


def rect(d, box, fill, outline=None, width=1):
    d.rectangle(box, fill=rgba(fill), outline=rgba(outline) if outline else None, width=width)


def medal(size, metal, empty=False):
    im = canvas(size)
    d = ImageDraw.Draw(im)
    scale = size // 24
    # Two short cloth tails; their outline is drawn before the medallion.
    cx = size // 2
    if not empty:
        for x, color in ((cx - 6 * scale, "red"), (cx + 1 * scale, "steel")):
            pts = [(x, 1 * scale), (x + 5 * scale, 1 * scale),
                   (x + 5 * scale, 10 * scale), (x + 3 * scale, 8 * scale),
                   (x, 10 * scale)]
            d.polygon(pts, fill=rgba(color), outline=rgba("outline"))
            rect(d, (x + scale, 2 * scale, x + 1 * scale, 6 * scale), "tan_hi")

    x0, y0 = 3 * scale, 7 * scale
    x1, y1 = 20 * scale, 23 * scale
    if empty:
        d.ellipse((x0, y0, x1, y1), fill=rgba("dark"), outline=rgba("steel_hi"), width=scale)
        d.ellipse((x0 + 2 * scale, y0 + 2 * scale, x1 - 2 * scale, y1 - 2 * scale),
                  outline=rgba("tan_dark"), width=scale)
        # faint five-point star slot
        star(d, cx, 15 * scale, 4 * scale, "steel_hi", "dark", scale)
        return im

    colors = {
        "gold": ("#755A22", "#C79A34", "#E8C65A", "#FFF0A0"),
        "silver": ("#4C5558", "#899497", "#C2CBCA", "#E8ECE7"),
        "bronze": ("#62402D", "#A96D3D", "#D19254", "#F1C083"),
    }[metal]
    shadow, base, light, shine = colors
    d.ellipse((x0, y0, x1, y1), fill=rgba(shadow), outline=rgba("outline"), width=scale)
    inset = 1 * scale
    d.ellipse((x0 + inset, y0 + inset, x1 - inset, y1 - inset),
              fill=rgba(base), outline=rgba(light), width=scale)
    # Pixel facets give the coin a stamped, beveled face.
    rect(d, (7 * scale, 10 * scale, 16 * scale, 10 * scale), light)
    rect(d, (6 * scale, 12 * scale, 7 * scale, 17 * scale), light)
    rect(d, (16 * scale, 12 * scale, 17 * scale, 17 * scale), shadow)
    rect(d, (8 * scale, 19 * scale, 15 * scale, 19 * scale), shadow)
    star(d, cx, 15 * scale, 6 * scale, shine, shadow, scale)
    # Tiny central insignia dot
    rect(d, (cx - scale, 15 * scale - scale, cx + scale, 15 * scale + scale), light)
    return im


def star(d, cx, cy, radius, fill, outline=None, scale=1):
    # Blocky five-point star with concave shoulders and a crisp dark edge.
    pts = [(cx + x * scale, cy + y * scale) for x, y in
           ((0, -5), (1, -2), (4, -2), (2, 0), (3, 4),
            (0, 2), (-3, 4), (-2, 0), (-4, -2), (-1, -2))]
    d.polygon(pts, fill=rgba(fill), outline=rgba(outline) if outline else None, width=scale)


def lock_icon():
    im = canvas(24); d = ImageDraw.Draw(im)
    # Shackle with open center and thick, square silhouette.
    rect(d, (7, 3, 16, 12), "outline")
    rect(d, (9, 5, 14, 11), "steel_hi")
    rect(d, (11, 7, 12, 11), "dark")
    rect(d, (5, 10, 18, 21), "outline")
    rect(d, (6, 11, 17, 20), "tan_dark")
    rect(d, (7, 12, 16, 13), "tan")
    rect(d, (11, 14, 12, 17), "outline")
    rect(d, (10, 17, 13, 18), "outline")
    rect(d, (8, 19, 15, 19), "wood_hi")
    return im


def speed_icon(count):
    im = canvas(24); d = ImageDraw.Draw(im)
    rect(d, (2, 10, 3, 14), "tan_dark")
    for i in range(count):
        x = 5 + i * 6
        d.polygon([(x, 6), (x + 3, 12), (x, 18), (x + 3, 18), (x + 7, 12), (x + 3, 6)],
                  fill=rgba("tan"), outline=rgba("outline"))
        rect(d, (x + 1, 8, x + 2, 9), "tan_hi")
    return im


def pause_icon():
    im = canvas(24); d = ImageDraw.Draw(im)
    rect(d, (5, 4, 10, 20), "outline"); rect(d, (6, 5, 9, 18), "tan")
    rect(d, (14, 4, 19, 20), "outline"); rect(d, (15, 5, 18, 18), "tan")
    rect(d, (7, 6, 8, 8), "tan_hi"); rect(d, (16, 6, 17, 8), "tan_hi")
    return im


def play_icon():
    im = canvas(24); d = ImageDraw.Draw(im)
    d.polygon([(6, 3), (9, 3), (20, 11), (20, 13), (9, 21), (6, 21)],
              fill=rgba("outline"))
    d.polygon([(8, 6), (10, 6), (17, 12), (10, 18), (8, 18)], fill=rgba("green"))
    rect(d, (9, 7, 10, 9), "green_hi")
    return im


def small_star():
    im = canvas(12); d = ImageDraw.Draw(im)
    # 9x9 star silhouette with 1px outline.
    rows = [1, 3, 5, 7, 9, 7, 5, 3, 1]
    for y, span in enumerate(rows, 1):
        mid = 5
        for x in range(mid - span // 2, mid + span // 2 + 1):
            rect(d, (x, y, x, y), "tan")
    # Dark edge corners; retained center remains high contrast.
    for x, y in ((5, 1), (2, 3), (8, 3), (1, 5), (9, 5), (3, 8), (7, 8), (5, 9)):
        rect(d, (x, y, x, y), "outline")
    for x, y in ((5, 2), (3, 4), (7, 4), (4, 7), (6, 7)):
        rect(d, (x, y, x, y), "tan_hi")
    return im


FONT = {
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "W": ("10001", "10001", "10001", "10101", "10101", "11011", "10001"),
    "E": ("11111", "10000", "10000", "11110", "10000", "10000", "11111"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "F": ("11111", "10000", "10000", "11110", "10000", "10000", "10000"),
    "N": ("10001", "11001", "11001", "10101", "10101", "10011", "10001"),
    "C": ("01111", "10000", "10000", "10000", "10000", "10000", "01111"),
}


def title_logo():
    im = canvas(320, 64)
    mask = Image.new("1", im.size, 0); md = ImageDraw.Draw(mask)
    text = "TOWER DEFENCE"; scale = 3; advance = 6 * scale
    width = (len(text) - 1) * advance + 5 * scale
    x0 = (320 - width) // 2; y0 = 14
    for ch_i, ch in enumerate(text):
        if ch == " ":
            continue
        glyph = FONT[ch]
        gx = x0 + ch_i * advance
        for gy, row in enumerate(glyph):
            for gxoff, bit in enumerate(row):
                if bit == "1":
                    md.rectangle((gx + gxoff * scale, y0 + gy * scale,
                                  gx + (gxoff + 1) * scale - 1,
                                  y0 + (gy + 1) * scale - 1), fill=1)
    # 1-pixel dark border around block glyphs.
    expanded = mask.filter(__import__("PIL.ImageFilter", fromlist=["MaxFilter"]).MaxFilter(3))
    outline = Image.new("RGBA", im.size, (0, 0, 0, 0))
    outline.paste(rgba("outline"), mask=expanded)
    im.alpha_composite(outline)
    fill = Image.new("RGBA", im.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(fill)
    for yy in range(64):
        for xx in range(320):
            if mask.getpixel((xx, yy)):
                # olive-to-tan banding, still hard pixel rows
                fd.point((xx, yy), fill=rgba("tan_hi" if yy < 26 else "tan"))
    im.alpha_composite(fill)
    d = ImageDraw.Draw(im)
    # Hazard stripe underline with dark diagonal cuts.
    rect(d, (27, 47, 292, 53), "outline")
    rect(d, (29, 48, 290, 51), "yellow")
    for x in range(31, 289, 12):
        d.polygon([(x, 48), (x + 4, 48), (x, 51), (x - 4, 51)], fill=rgba("outline"))
    rect(d, (18, 49, 25, 52), "steel")
    rect(d, (294, 49, 301, 52), "steel")
    return im


def menu_bg():
    im = Image.new("RGBA", (480, 264), rgba("ground")); d = ImageDraw.Draw(im)
    # Broad, quiet terrain patches. Keep center open for menu copy.
    for box, fill in [((0, 0, 479, 48), "ground_hi"), ((0, 218, 479, 263), "olive_dark"),
                      ((0, 48, 54, 217), "olive_dark"), ((426, 48, 479, 217), "olive_dark")]:
        rect(d, box, fill)
    for x, y, w, h in [(22, 28, 39, 8), (94, 56, 28, 5), (351, 28, 48, 8),
                       (61, 200, 31, 7), (388, 202, 50, 7), (165, 230, 36, 5)]:
        rect(d, (x, y, x + w, y + h), "ground_hi")
    # Winding dirt/asphalt road through right side, with subdued edge markings.
    road = [(205, -5), (275, -5), (275, 54), (313, 83), (381, 83),
            (414, 108), (414, 160), (385, 190), (335, 190), (303, 222),
            (303, 268), (230, 268), (230, 227), (271, 183), (343, 183),
            (364, 164), (364, 115), (349, 105), (290, 105), (231, 60)]
    d.polygon(road, fill=rgba("road"))
    d.line(road + [road[0]], fill=rgba("road_hi"), width=2)
    # Broken center line
    for y in range(10, 46, 14): rect(d, (238, y, 240, y + 5), "tan_dark")
    for x in range(289, 345, 15): rect(d, (x, 92, x + 6, 94), "tan_dark")
    for y in range(123, 155, 14): rect(d, (396, y, 398, y + 5), "tan_dark")
    # Sandbag positions, in shallow stacks with dark outline and muted highlights.
    def sandbag(x, y, w=48):
        rect(d, (x, y + 5, x + w, y + 17), "outline")
        for i in range(0, max(1, w - 4), 13):
            rect(d, (x + i + 1, y + 6, min(x + w - 1, x + i + 11), y + 10), "tan_dark")
            rect(d, (x + i + 2, y + 7, min(x + w - 2, x + i + 9), y + 8), "tan")
        rect(d, (x + 6, y, x + w - 5, y + 6), "outline")
        rect(d, (x + 7, y + 1, x + w - 6, y + 4), "tan_dark")
    sandbag(24, 83, 53); sandbag(411, 50, 51); sandbag(31, 164, 45)
    # Two top-down compact turrets around the perimeter.
    def turret(cx, cy, facing="up"):
        rect(d, (cx - 14, cy + 8, cx + 14, cy + 18), "outline")
        rect(d, (cx - 12, cy + 10, cx + 12, cy + 16), "steel")
        for xx in range(cx - 10, cx + 11, 7): rect(d, (xx, cy + 12, xx + 3, cy + 14), "steel_hi")
        d.ellipse((cx - 10, cy - 5, cx + 10, cy + 15), fill=rgba("outline"))
        d.ellipse((cx - 8, cy - 3, cx + 8, cy + 13), fill=rgba("olive"))
        d.rectangle((cx - 3, cy - 14, cx + 3, cy + 1), fill=rgba("outline"))
        d.rectangle((cx - 1, cy - 12, cx + 1, cy), fill=rgba("steel_hi"))
        rect(d, (cx - 5, cy + 1, cx + 5, cy + 4), "green_hi")
    turret(87, 119); turret(440, 179)
    # Ammunition crates and a couple of drums.
    def crate(x, y):
        rect(d, (x, y, x + 24, y + 21), "outline")
        rect(d, (x + 2, y + 2, x + 22, y + 19), "wood")
        rect(d, (x + 4, y + 4, x + 20, y + 6), "wood_hi")
        d.line((x + 3, y + 17, x + 20, y + 3), fill=rgba("tan_dark"), width=2)
        rect(d, (x + 9, y + 9, x + 15, y + 13), "tan_dark")
    crate(130, 73); crate(358, 219); crate(30, 221)
    for x, y in ((111, 181), (453, 28)):
        d.ellipse((x, y, x + 17, y + 17), fill=rgba("outline"))
        d.ellipse((x + 2, y + 2, x + 15, y + 15), fill=rgba("steel"))
        rect(d, (x + 5, y + 4, x + 12, y + 5), "steel_hi")
        rect(d, (x + 7, y + 7, x + 10, y + 11), "tan_dark")
    # Sparse low-contrast scrub pixel clusters
    for x, y in ((19, 53), (75, 44), (151, 29), (190, 209), (333, 49), (465, 212), (59, 138)):
        rect(d, (x, y, x + 7, y + 2), "olive")
        rect(d, (x + 2, y - 2, x + 5, y - 1), "green")
    return im


def build_assets():
    assets = {
        "medal_gold.png": medal(24, "gold"), "medal_silver.png": medal(24, "silver"),
        "medal_bronze.png": medal(24, "bronze"), "medal_gold_lg.png": medal(48, "gold"),
        "medal_silver_lg.png": medal(48, "silver"), "medal_bronze_lg.png": medal(48, "bronze"),
        "medal_empty.png": medal(24, "gold", True), "lock.png": lock_icon(),
        "speed_1x.png": speed_icon(1), "speed_2x.png": speed_icon(2),
        "speed_3x.png": speed_icon(3), "pause.png": pause_icon(), "play.png": play_icon(),
        "title_logo.png": title_logo(), "menu_bg.png": menu_bg(),
    }
    return assets


def contact_sheet(assets):
    bg = "#1D2322"; pad = 12; gap = 12; cell_w = 180; label_h = 22
    small_names = [n for n, im in assets.items() if im.width <= 48 and im.height <= 48]
    special_names = [n for n in assets if n not in small_names]
    columns = 4
    rows = (len(small_names) + columns - 1) // columns
    small_h = rows * (144 + label_h + gap)
    special_h = sum(max(assets[n].height * 3, 36) + label_h + gap for n in special_names)
    width = max(columns * cell_w + (columns + 1) * gap, max(assets[n].width * 3 + 2 * pad for n in special_names))
    sheet = Image.new("RGB", (width, pad + small_h + special_h + pad), bg)
    d = ImageDraw.Draw(sheet); font = ImageFont.load_default()
    for i, name in enumerate(small_names):
        col, row = i % columns, i // columns
        x = gap + col * (cell_w + gap); y = pad + row * (144 + label_h + gap)
        im = assets[name].convert("RGBA").resize((assets[name].width * 3, assets[name].height * 3), Image.Resampling.NEAREST)
        sheet.paste(im, (x + (cell_w - im.width) // 2, y), im)
        d.text((x, y + 146), name, fill="#D5D8D2", font=font)
    y = pad + small_h
    for name in special_names:
        im = assets[name].convert("RGBA").resize((assets[name].width * 3, assets[name].height * 3), Image.Resampling.NEAREST)
        x = (width - im.width) // 2
        sheet.paste(im, (x, y), im)
        d.text((x, y + im.height + 3), name, fill="#D5D8D2", font=font)
        y += max(im.height, 36) + label_h + gap
    return sheet


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    assets = build_assets()
    for name, im in assets.items():
        im.save(OUT / name, "PNG", optimize=True)
    contact_sheet(assets).save(SHEET, "PNG", optimize=True)
    for name in assets.keys():
        print(OUT / name)


if __name__ == "__main__":
    main()
