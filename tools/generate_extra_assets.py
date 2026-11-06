#!/usr/bin/env python3
"""Generate 31 extra military pixel sprites and a labelled 4x contact sheet.

Run: python3 generate_extra_assets.py
Requires only Pillow >= 10. Output is relative to the working directory.
All artwork is drawn at its native resolution: no filtering or antialiasing.
Palette and rectangle vocabulary follow tools/generate_pixel_assets.py.
The reference project is not read, imported, or modified at runtime.
Bosses and directional projectiles face up; rail travels right.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


P = {
    "outline": "#202824", "track": "#2B302C", "tread": "#4B5349",
    "heavy": "#3F4B36", "olive": "#556B4A", "armor": "#6A7A5F",
    "tank": "#2F3A2A", "steel": "#37474F", "steel_light": "#607D8B",
    "air": "#2C3E50", "air_light": "#6C7A89", "blue": "#88AACC",
    "tan_dark": "#7C6F57", "tan": "#C2B280", "tan_light": "#D4C08A",
    "yellow": "#F9A825", "red": "#B04040", "red_light": "#DE6850",
    "wood": "#9C6B3D", "wood_dark": "#6B5A4A", "wood_light": "#B18D5F",
    "ice_dark": "#5F9DB3", "ice": "#88C0D0", "ice_light": "#D3F3F5",
    "orange": "#F39B42", "flame": "#E36C32", "hot": "#FFF1B8",
    "violet": "#B5A3D9", "violet_light": "#ECE1FF",
    "ground": "#6A6F5A", "sheet": "#1D2322",
}


def color(value, alpha=255):
    value = P.get(value, value).lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (alpha,)


class Sprite:
    """Integer-only native-pixel drawing, with optional explicit alpha steps."""

    def __init__(self, width=24, height=None, background=None):
        self.image = Image.new("RGBA", (width, height or width),
                               color(background) if background else (0, 0, 0, 0))
        self.draw = ImageDraw.Draw(self.image)

    def rect(self, x, y, w, h, fill, alpha=255):
        self.draw.rectangle((x, y, x + w - 1, y + h - 1), fill=color(fill, alpha))

    def pixel(self, x, y, fill, alpha=255):
        self.rect(x, y, 1, 1, fill, alpha)

    def line(self, points, fill, alpha=255):
        self.draw.line(points, fill=color(fill, alpha), width=1)

    def polygon(self, points, fill, outline=None, alpha=255):
        self.draw.polygon(points, fill=color(fill, alpha),
                          outline=color(outline, alpha) if outline else None)

    def panel(self, x, y, w, h, fill, highlight=None):
        self.rect(x, y, w, h, "outline")
        self.rect(x + 1, y + 1, w - 2, h - 2, fill)
        if highlight and w > 3 and h > 3:
            self.rect(x + 1, y + 1, w - 2, 1, highlight)

    def ring(self, cx, cy, radius, fill, alpha=255, thickness=1):
        # Midpoint-circle rasterization: explicit hard pixels, no smoothing.
        for r in range(radius - thickness + 1, radius + 1):
            x, y, error = r, 0, 1 - r
            while x >= y:
                for dx, dy in ((x, y), (y, x), (-y, x), (-x, y),
                               (-x, -y), (-y, -x), (y, -x), (x, -y)):
                    self.pixel(cx + dx, cy + dy, fill, alpha)
                y += 1
                if error < 0:
                    error += 2 * y + 1
                else:
                    x -= 1
                    error += 2 * (y - x) + 1


def hazard(s, x, y, width):
    """Two-pixel warning band; short diagonal dark cuts stay readable."""
    s.rect(x, y, width, 2, "yellow")
    for dx in range(0, width, 4):
        s.pixel(x + dx, y + 1, "outline")
        if dx + 1 < width:
            s.pixel(x + dx + 1, y, "outline")


def tracks(s, left=4, right=27, top=7, height=24):
    for x in (left, right):
        s.panel(x, top, 5, height, "track")
        for y in range(top + 2, top + height - 1, 3):
            s.rect(x + 1, y, 3, 1, "tread")


def heavy_boss():
    # Six-wheel heavy assault carrier, broad bolt-on shoulder armor.
    s = Sprite(36)
    for x in (5, 27):
        for y in (9, 17, 25):
            s.panel(x, y, 4, 6, "track", "tread")
    s.panel(8, 7, 20, 25, "heavy", "armor")
    s.panel(10, 5, 16, 9, "olive", "armor")
    s.panel(10, 15, 16, 11, "olive", "armor")
    for x in (6, 25):
        s.panel(x, 12, 5, 9, "heavy", "armor")
        s.panel(x, 23, 5, 6, "heavy", "armor")
    s.panel(13, 12, 10, 10, "heavy", "armor")
    s.panel(16, 2, 4, 13, "steel", "steel_light")
    s.rect(17, 3, 2, 2, "track")
    s.panel(14, 23, 8, 5, "tank")
    s.rect(15, 24, 6, 1, "armor")
    hazard(s, 11, 9, 4)
    hazard(s, 21, 9, 4)
    s.rect(10, 29, 3, 1, "red")
    s.rect(23, 29, 3, 1, "red")
    s.pixel(12, 17, "tan")
    s.pixel(23, 17, "tan")
    return s


def tank_boss():
    s = Sprite(36)
    tracks(s)
    s.polygon([(9, 7), (13, 5), (22, 5), (26, 7), (26, 30),
               (23, 32), (12, 32), (9, 30)], "tank", "outline")
    s.rect(10, 9, 16, 19, "olive")
    for x in (9, 23):
        for y in (9, 17, 25):
            s.panel(x, y, 4, 6, "heavy", "armor")
    s.panel(13, 12, 10, 13, "heavy", "armor")
    s.panel(15, 10, 6, 5, "olive", "armor")
    s.panel(16, 1, 4, 13, "steel", "steel_light")
    s.panel(15, 1, 6, 4, "steel")
    s.rect(16, 2, 4, 1, "track")
    s.panel(15, 19, 5, 4, "olive")
    s.pixel(16, 20, "armor")
    hazard(s, 13, 7, 10)
    s.rect(14, 28, 8, 1, "tank")
    s.rect(14, 30, 8, 1, "tank")
    s.rect(10, 30, 2, 1, "red")
    s.rect(24, 30, 2, 1, "red")
    return s


def bulldozer_boss():
    s = Sprite(36)
    tracks(s, top=11, height=21)
    s.panel(9, 10, 18, 22, "tan_dark", "tan")
    for x in (9, 23):
        s.panel(x, 12, 4, 12, "heavy", "armor")
        s.panel(x, 7, 4, 9, "steel", "steel_light")
    # Blade is the forward silhouette, with a reinforced cutting edge.
    s.polygon([(2, 3), (6, 5), (29, 5), (33, 3), (33, 10),
               (29, 12), (6, 12), (2, 10)], "tan_dark", "outline")
    s.rect(4, 6, 28, 4, "tan")
    hazard(s, 5, 7, 26)
    s.rect(7, 10, 22, 1, "steel_light")
    s.panel(12, 17, 12, 11, "heavy", "armor")
    s.panel(14, 18, 8, 5, "steel", "blue")
    s.rect(15, 20, 6, 2, "air")
    s.rect(17, 19, 1, 3, "steel")
    s.panel(14, 28, 8, 3, "steel")
    s.rect(15, 29, 6, 1, "tread")
    s.rect(10, 29, 2, 1, "red")
    s.rect(24, 29, 2, 1, "red")
    return s


def sky_tank_boss():
    # Armored tiltrotor gunship: conventional wings, cockpit and twin rotors.
    s = Sprite(36)
    s.panel(3, 15, 30, 6, "air", "air_light")
    s.panel(8, 20, 5, 8, "steel", "air_light")
    s.panel(23, 20, 5, 8, "steel", "air_light")
    for x in (9, 24):
        s.rect(x, 24, 3, 2, "track")
        s.pixel(x + 1, 24, "red")
    s.polygon([(16, 3), (19, 3), (22, 7), (22, 23), (20, 27),
               (20, 31), (15, 31), (15, 27), (13, 23), (13, 7)],
              "air", "outline")
    s.rect(15, 11, 6, 13, "air_light")
    s.panel(15, 6, 6, 7, "steel", "blue")
    s.rect(16, 8, 4, 3, "air")
    s.rect(17, 7, 1, 4, "steel_light")
    s.panel(14, 15, 8, 7, "air", "air_light")
    hazard(s, 15, 17, 6)
    s.panel(11, 28, 14, 3, "air_light")
    s.rect(16, 25, 4, 4, "steel")
    for cx in (6, 29):
        s.panel(cx - 2, 9, 5, 12, "air", "air_light")
        # Short blocky rotor blades and an orthogonal blade pair.
        s.panel(cx - 5, 11, 11, 3, "air_light")
        s.panel(cx - 1, 5, 3, 15, "steel_light")
        s.rect(cx - 4, 12, 3, 1, "tan")
        s.rect(cx + 2, 12, 3, 1, "tan")
        s.rect(cx, 8, 1, 2, "tan")
        s.rect(cx, 16, 1, 2, "tan")
        s.rect(cx, 12, 1, 1, "outline")
    s.pixel(13, 19, "red")
    s.pixel(22, 19, "red")
    return s


def projectiles():
    result = {}
    s = Sprite(8)
    s.rect(3, 2, 2, 3, "yellow")
    s.rect(3, 2, 2, 2, "hot")
    s.pixel(3, 5, "orange")
    s.pixel(3, 6, "red")
    result["bullet"] = s

    s = Sprite(8)
    s.polygon([(3, 1), (4, 1), (5, 3), (5, 6), (2, 6), (2, 3)],
              "tan", "outline")
    s.rect(3, 2, 2, 3, "tan_light")
    s.rect(3, 5, 2, 1, "yellow")
    result["shell"] = s

    s = Sprite(8)
    s.polygon([(3, 0), (4, 0), (5, 3), (5, 4), (6, 6), (1, 6),
               (2, 4), (2, 3)], "olive", "outline")
    s.rect(3, 2, 2, 3, "tan")
    s.rect(3, 1, 2, 1, "red_light")
    s.rect(3, 5, 2, 2, "orange")
    s.pixel(3, 7, "yellow")
    result["rocket"] = s

    s = Sprite(8)
    s.polygon([(3, 0), (4, 0), (5, 2), (5, 4), (7, 6), (0, 6),
               (2, 4), (2, 2)], "steel_light", "outline")
    s.rect(3, 1, 2, 4, "ice_light")
    s.rect(3, 1, 2, 1, "red")
    s.rect(3, 5, 2, 2, "yellow")
    s.pixel(4, 7, "orange")
    result["missile"] = s

    s = Sprite(8)
    s.polygon([(3, 1), (5, 1), (6, 3), (6, 5), (4, 6), (2, 5),
               (1, 3)], "ice_dark")
    s.rect(2, 2, 4, 3, "ice")
    s.rect(3, 2, 2, 2, "ice_light")
    s.pixel(2, 6, "ice")
    s.pixel(5, 7, "ice_dark")
    result["cryo"] = s

    s = Sprite(8)
    s.polygon([(4, 0), (4, 2), (6, 1), (6, 4), (7, 5), (5, 7),
               (2, 7), (0, 5), (2, 2), (2, 4)], "red")
    s.polygon([(4, 2), (5, 4), (6, 5), (5, 6), (2, 6), (1, 5),
               (3, 4)], "flame")
    s.rect(3, 4, 2, 2, "yellow")
    s.pixel(4, 4, "hot")
    result["flame"] = s

    s = Sprite(8)
    s.line([(1, 1), (3, 2), (2, 4), (5, 3), (4, 6), (6, 6)], "violet")
    s.line([(4, 0), (4, 2), (6, 3), (5, 4), (7, 4)], "violet_light")
    s.rect(3, 3, 2, 2, "violet_light")
    s.pixel(1, 6, "violet")
    result["emp"] = s

    s = Sprite(16, 4)
    s.rect(1, 1, 14, 2, "ice_dark")
    s.rect(5, 1, 10, 2, "ice")
    s.rect(9, 1, 6, 1, "ice_light")
    s.rect(13, 1, 2, 2, "hot")
    result["rail"] = s

    s = Sprite(8)
    s.polygon([(3, 1), (4, 1), (5, 2), (5, 4), (4, 5), (5, 7),
               (2, 7), (3, 5), (2, 4), (2, 2)], "olive", "outline")
    s.rect(3, 2, 2, 2, "tan_light")
    s.rect(3, 4, 2, 1, "yellow")
    s.pixel(3, 6, "steel_light")
    result["mortar"] = s
    return result


def effects():
    result = {}
    s = Sprite()
    s.polygon([(10, 5), (13, 8), (17, 6), (16, 10), (19, 12),
               (15, 14), (16, 18), (12, 16), (8, 18), (8, 14),
               (5, 12), (8, 10), (7, 7), (10, 8)], "flame")
    s.polygon([(10, 8), (13, 9), (15, 11), (15, 14), (12, 16),
               (9, 14), (8, 11)], "yellow")
    s.rect(10, 10, 4, 4, "hot")
    s.pixel(5, 7, "orange")
    s.pixel(18, 16, "orange")
    result["explosion_1"] = s

    s = Sprite()
    s.ring(11, 11, 8, "red", 200)
    s.ring(11, 11, 7, "orange", thickness=2)
    s.ring(11, 11, 5, "yellow")
    s.rect(9, 9, 4, 4, "tan_light", 150)
    for x, y in ((5, 5), (17, 7), (6, 17), (16, 17)):
        s.pixel(x, y, "hot")
    result["explosion_2"] = s

    s = Sprite()
    s.polygon([(8, 4), (13, 4), (15, 6), (18, 6), (20, 9),
               (19, 14), (16, 16), (15, 19), (9, 19), (6, 17),
               (3, 14), (4, 9), (7, 8)], "#51574E", alpha=125)
    s.polygon([(8, 7), (13, 6), (16, 8), (16, 12), (18, 14),
               (14, 17), (10, 16), (8, 13), (6, 12)], "#73796A", alpha=160)
    s.rect(9, 8, 4, 2, "#8A8C76", 145)
    for x, y in ((7, 14), (15, 11), (12, 17)):
        s.pixel(x, y, "orange", 200)
    result["explosion_3"] = s

    s = Sprite()
    s.ring(11, 11, 8, "tan", 150)
    for points in ([(5, 7), (7, 5), (9, 4)], [(14, 4), (17, 6)],
                   [(19, 12), (18, 15), (16, 17)], [(9, 19), (6, 17)]):
        s.line(points, "tan_light", 220)
    result["splash_ring"] = s

    s = Sprite()
    s.polygon([(7, 4), (11, 3), (15, 5), (19, 5), (21, 9),
               (19, 12), (21, 15), (18, 19), (13, 20), (10, 18),
               (5, 19), (3, 15), (4, 11), (2, 8), (5, 6)],
              "#667460", alpha=85)
    s.polygon([(7, 7), (12, 6), (16, 8), (17, 12), (15, 16),
               (10, 17), (6, 14), (5, 10)], "#86937A", alpha=105)
    s.rect(8, 8, 4, 2, "#A0AC90", 95)
    s.rect(13, 13, 3, 2, "#728069", 100)
    result["gas_cloud"] = s

    s = Sprite()
    for points in ([(11, 5), (11, 9)], [(13, 10), (16, 7)],
                   [(14, 12), (18, 12)], [(13, 14), (15, 17)],
                   [(10, 14), (8, 17)], [(9, 11), (6, 9)]):
        s.line(points, "yellow")
    s.rect(10, 10, 3, 3, "hot")
    s.pixel(17, 6, "orange")
    s.pixel(6, 16, "orange")
    result["hit_spark"] = s

    s = Sprite()
    s.ring(11, 11, 9, "ice_dark", 110)
    s.ring(11, 11, 8, "ice", 135)
    for x, y, dx, dy in ((11, 2, 0, 1), (20, 11, -1, 0),
                          (11, 20, 0, -1), (2, 11, 1, 0)):
        s.line([(x, y), (x + dx * 3, y + dy * 3)], "ice_light", 185)
    for x, y in ((5, 5), (17, 5), (17, 17), (5, 17)):
        s.pixel(x, y, "ice_light", 160)
    result["slow_overlay"] = s

    s = Sprite()
    for x, y in ((5, 15), (10, 19), (16, 17), (19, 11), (8, 8)):
        s.rect(x, y, 2, 2, "red", 210)
        s.pixel(x, y - 1, "orange")
        s.pixel(x, y, "yellow")
    s.pixel(13, 5, "flame", 210)
    s.pixel(4, 10, "orange", 210)
    result["burn_overlay"] = s
    return result


def prop_shadow(s, x, y, w):
    s.rect(x + 1, y, w, 1, "outline", 150)


def props():
    result = {}
    s = Sprite()
    for x, y, w, h, fill, light in ((3, 5, 10, 10, "wood", "wood_light"),
                                   (12, 11, 9, 10, "tan_dark", "tan")):
        prop_shadow(s, x, y + h, w)
        s.panel(x, y, w, h, fill, light)
        s.rect(x + 2, y + 1, 1, h - 2, "wood_dark")
        s.rect(x + w - 3, y + 1, 1, h - 2, "wood_dark")
        s.rect(x + 1, y + h // 2, w - 2, 1, "wood_dark")
        s.rect(x + 4, y + 3, 2, 2, "tan_light")
    result["crates"] = s

    s = Sprite()
    for x, y, fill, light in ((3, 6, "heavy", "armor"),
                              (13, 10, "red", "red_light")):
        prop_shadow(s, x, y + 9, 7)
        s.panel(x, y, 7, 9, fill, light)
        s.rect(x + 1, y + 3, 5, 1, "outline")
        s.rect(x + 1, y + 6, 5, 1, "outline")
        s.rect(x + 2, y + 1, 3, 1, light)
        s.pixel(x + 4, y + 2, "outline")
        s.rect(x + 2, y + 4, 2, 2, "yellow")
    result["fuel_drums"] = s

    s = Sprite()
    for x, y in ((3, 6), (10, 6), (17, 7), (2, 11), (9, 11),
                  (16, 12), (3, 16), (10, 16)):
        prop_shadow(s, x, y + 5, 6)
        s.panel(x, y, 6, 5, "tan_dark", "tan")
        s.rect(x + 2, y + 2, 2, 1, "tan")
    result["sandbags"] = s

    s = Sprite()
    prop_shadow(s, 4, 20, 16)
    s.panel(3, 8, 4, 11, "track", "tread")
    s.panel(17, 10, 4, 9, "track", "tread")
    s.polygon([(6, 7), (14, 6), (18, 10), (17, 18), (14, 20),
               (6, 18), (5, 13)], "heavy", "outline")
    s.rect(8, 9, 7, 7, "wood_dark")
    s.rect(9, 11, 4, 4, "track")
    s.line([(11, 10), (14, 8), (18, 7)], "steel_light")
    s.line([(12, 10), (15, 9), (19, 8)], "outline")
    s.line([(6, 15), (8, 13), (8, 10)], "outline")
    s.rect(14, 16, 3, 2, "red")
    s.rect(4, 20, 3, 1, "tread")
    s.rect(20, 6, 2, 2, "wood_dark")
    result["wreck"] = s

    s = Sprite()
    for x, y, w, h, fill in ((3, 6, 6, 5, "#6B5A4A"),
                            (12, 4, 5, 4, "#737568"),
                            (9, 12, 7, 6, "#5B5F55"),
                            (17, 11, 4, 5, "#7C6F57"),
                            (3, 17, 5, 3, "#777867"),
                            (16, 19, 4, 3, "#6B5A4A")):
        prop_shadow(s, x, y + h, w)
        s.panel(x, y, w, h, fill)
        s.rect(x + 1, y + 1, w - 2, 1, "tan_dark")
    s.pixel(10, 7, "tan_dark")
    s.pixel(7, 14, "tread")
    s.pixel(12, 21, "tan_dark")
    result["rubble"] = s

    s = Sprite()
    # Sparse chain-link mesh in a horizontal fence segment.
    for start in range(-6, 22, 4):
        for y in range(7, 17):
            x = start + y - 7
            if 3 <= x <= 20:
                s.pixel(x, y, "air_light", 200)
            x = start + 16 - y
            if 3 <= x <= 20:
                s.pixel(x, y, "air_light", 200)
    s.rect(2, 6, 20, 1, "outline")
    s.rect(2, 7, 20, 1, "air_light")
    s.rect(2, 17, 20, 1, "steel")
    for x in (2, 19):
        prop_shadow(s, x, 21, 3)
        s.panel(x, 4, 3, 17, "steel_light")
        s.pixel(x + 1, 5, "tan")
    result["fence"] = s

    s = Sprite()
    prop_shadow(s, 6, 22, 13)
    s.panel(5, 18, 14, 4, "steel", "air_light")
    s.panel(6, 14, 5, 6, "heavy", "armor")
    s.rect(7, 16, 3, 1, "track")
    s.pixel(7, 18, "yellow")
    # Braced mast and a small conventional dish, viewed from above.
    s.line([(9, 19), (12, 6), (16, 19)], "outline")
    s.line([(10, 18), (12, 8), (15, 18)], "air_light")
    s.line([(10, 15), (14, 12), (11, 11), (13, 9)], "steel_light")
    s.rect(11, 3, 3, 15, "outline")
    s.rect(12, 2, 1, 15, "air_light")
    s.rect(9, 5, 7, 1, "steel_light")
    s.pixel(12, 2, "red_light")
    s.polygon([(16, 7), (19, 8), (20, 10), (19, 13), (16, 14),
               (15, 12), (15, 9)], "air_light", "outline")
    s.line([(16, 9), (18, 10), (16, 12)], "blue")
    s.line([(16, 11), (13, 11)], "tan")
    result["comms_tower"] = s
    return result


def ground(variant):
    # The reference buildable pad's exact interior color. A two-pixel common
    # perimeter and sparse, low-contrast interior marks keep EVERY variant
    # seamless beside itself and the others, without visible tile borders.
    s = Sprite(background="ground")
    clusters = {
        1: [(5, 7, 2, 1), (16, 15, 1, 1), (10, 18, 2, 1)],
        2: [(8, 5, 1, 2), (18, 11, 2, 1), (5, 17, 1, 1)],
        3: [(15, 5, 2, 1), (5, 12, 1, 1), (13, 17, 1, 2)],
    }
    for x, y, w, h in clusters[variant]:
        s.rect(x, y, w, h, "#666B56")
        s.pixel(x + w, y, "#6D725D")
    return s


def contact_sheet(groups, output):
    columns, cell_w, cell_h = 6, 172, 172
    margin, header_h = 20, 28
    height = margin + 42 + sum(header_h + ((len(items) + columns - 1) // columns)
                               * cell_h + 12 for _, items in groups)
    sheet = Image.new("RGB", (margin * 2 + columns * cell_w, height), P["sheet"])
    draw = ImageDraw.Draw(sheet)
    # Pillow's bundled font avoids system font dependencies. Binary font mode
    # also keeps lettering hard-edged. Sprite enlargement alone is exactly 4x.
    font = ImageFont.load_default()
    draw.fontmode = "1"
    draw.text((margin, margin), "FIELD ASSETS / MODERN MILITARY", font=font,
              fill=P["tan_light"])
    draw.text((margin, margin + 16), "4X NEAREST / NATIVE PIXEL ART", font=font,
              fill=P["air_light"])
    y = margin + 42
    for group, items in groups:
        draw.text((margin, y + 4), group.upper(), font=font, fill=P["tan"])
        y += header_h
        for index, (name, sprite) in enumerate(items.items()):
            x = margin + index % columns * cell_w
            top = y + index // columns * cell_h
            image = sprite.image
            large = image.resize((image.width * 4, image.height * 4),
                                 resample=Image.Resampling.NEAREST)
            sheet.paste(large, (x + (cell_w - large.width) // 2,
                                top + (144 - large.height) // 2), large)
            label = name + ".png"
            box = draw.textbbox((0, 0), label, font=font)
            draw.text((x + (cell_w - (box[2] - box[0])) // 2, top + 148),
                      label, font=font, fill="#D1D3C5")
        y += ((len(items) + columns - 1) // columns) * cell_h + 12
    sheet.save(output, "PNG")


def validate(groups):
    """Check native dimensions, transparency, and compatible ground edges."""
    assert sum(len(items) for _, items in groups) == 31
    for group, items in groups:
        for name, sprite in items.items():
            im = sprite.image
            expected = ((36, 36) if group == "bosses" else
                        (16, 4) if name == "rail" else
                        (8, 8) if group == "projectiles" else (24, 24))
            assert im.mode == "RGBA" and im.size == expected, (group, name)
            alpha = im.getchannel("A")
            if group == "tiles":
                assert alpha.getextrema() == (255, 255)
                # All four two-pixel border strips are the same uniform base.
                for box in ((0, 0, 24, 2), (0, 22, 24, 24),
                            (0, 0, 2, 24), (22, 0, 24, 24)):
                    assert set(im.crop(box).getdata()) == {color("ground")}
            else:
                assert alpha.getextrema()[0] == 0, name
                assert alpha.getbbox() is not None, name
            if group in ("bosses", "projectiles"):
                assert set(alpha.getdata()) <= {0, 255}, name
    for name in ("gas_cloud", "slow_overlay"):
        assert any(0 < a < 255 for a in dict(groups)["fx"][name].image
                   .getchannel("A").getdata())


def main():
    groups = [
        ("bosses", {"heavy_boss": heavy_boss(), "tank_boss": tank_boss(),
                    "bulldozer_boss": bulldozer_boss(),
                    "sky_tank_boss": sky_tank_boss()}),
        ("projectiles", projectiles()),
        ("fx", effects()),
        ("props", props()),
        ("tiles", {f"ground_{i}": ground(i) for i in range(1, 4)}),
    ]
    validate(groups)
    root = Path(__file__).resolve().parent.parent
    output = root / "src" / "assets" / "sprites"
    files = []
    for group, items in groups:
        directory = output / group
        directory.mkdir(parents=True, exist_ok=True)
        for name, sprite in items.items():
            path = directory / (name + ".png")
            sprite.image.save(path, "PNG")
            files.append(path)
    sheet = root / "art" / "extra_contact_sheet.png"
    contact_sheet(groups, sheet)
    files.append(sheet)
    print(f"Generated {len(files) - 1} sprites and 1 contact sheet:")
    for path in files:
        print(path.relative_to(root).as_posix())


if __name__ == "__main__":
    main()
