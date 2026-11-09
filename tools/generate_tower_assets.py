"""Isometric tower sprites: 30 towers x 5 levels, 24x24 PNG (src/assets) + SVG (art).

Each sprite is a small 3D scene (boxes, prisms, cylinders, domes) ray-cast through an
orthographic 2:1 pixel-art projection, lit from the upper left, with self-shadowing, a
cast ground shadow and a 1px coloured outline. Every sample keeps a flat colour (no
blending), so the result stays crisp pixel art.

Levels change the shape and the colour of a tower:
  L1 plain plinth and weapon
  L2 taller plinth, bronze trim and muzzle ring, side armour, thicker barrel
  L3 silver trim, family module (ammo box, coils, radar, ...)
  L4 gold trim on plinth and body, reinforced skirt, a bigger module
  L5 violet trim, a glowing violet band on the body, extra barrels, glowing module parts

Run from the repo root: python3 tools/generate_tower_assets.py
"""
import math
import os

import numpy as np
from PIL import Image

SIZE = 24
SS = 4  # supersamples per pixel axis; each pixel takes the most common sample colour
CX, CY = 12.0, 11.5  # screen position of world (0, 0, 0); footprint 0..12 fills the tile diamond

# Light direction (towards the light): upper left. +y faces are lit, +x faces are in shade,
# and ground shadows fall to the right.
LIGHT = np.array([-0.35, 0.55, 0.85])
LIGHT = LIGHT / np.linalg.norm(LIGHT)
SHADOW_ALPHA = 90
SHADE_COOL = (24, 28, 40)
SHADE_WARM = (246, 240, 214)

PALETTES = {
    "assault": {"base": "#556B2F", "body": "#6B8E23", "barrel": "#2F3B1E", "accent": "#C2B280"},
    "precision": {"base": "#4C566A", "body": "#5E81AC", "barrel": "#2E3440", "accent": "#88C0D0"},
    "explosive": {"base": "#8D6E63", "body": "#A1887F", "barrel": "#4E342E", "accent": "#D4A373"},
    "control": {"base": "#37474F", "body": "#607D8B", "barrel": "#263238", "accent": "#4DD0E1"},
    "support": {"base": "#7C6F57", "body": "#9E9D24", "barrel": "#5D4037", "accent": "#F9A825"},
    "aa": {"base": "#455A64", "body": "#607D8B", "barrel": "#263238", "accent": "#64B5F6"},
}

# Trim colour per level: the quickest way to read a tower's level at a glance.
TIER = {1: None, 2: "#B8763A", 3: "#D5DEE6", 4: "#F2C230", 5: "#C77DFF"}

TOWERS = [
    {"id": "ar_turret", "family": "assault", "barrel": "single", "module": "ammo"},
    {"id": "smg_nest", "family": "assault", "barrel": "short", "module": "ammo"},
    {"id": "lmg_bunker", "family": "assault", "barrel": "single", "module": "shield"},
    {"id": "gatling_turret", "family": "assault", "barrel": "triple", "module": "ammo"},
    {"id": "rail_autocannon", "family": "assault", "barrel": "long", "module": "coil"},

    {"id": "marksman_tower", "family": "precision", "barrel": "long", "module": "scope"},
    {"id": "sniper_nest", "family": "precision", "barrel": "long", "module": "scope"},
    {"id": "gauss_rifle", "family": "precision", "barrel": "long", "module": "coil"},
    {"id": "coilgun", "family": "precision", "barrel": "long", "module": "coil"},
    {"id": "longshot_beacon", "family": "precision", "barrel": "long", "module": "antenna"},

    {"id": "grenade_launcher", "family": "explosive", "barrel": "wide", "module": "tube"},
    {"id": "mortar", "family": "explosive", "barrel": "tube", "module": "tube"},
    {"id": "howitzer", "family": "explosive", "barrel": "wide", "module": "shield"},
    {"id": "rocket_pod", "family": "explosive", "barrel": "pod", "module": "pod"},
    {"id": "cluster_cannon", "family": "explosive", "barrel": "wide", "module": "pod"},

    {"id": "cryo_sprayer", "family": "control", "barrel": "short", "module": "canister"},
    {"id": "incendiary_turret", "family": "control", "barrel": "short", "module": "canister"},
    {"id": "emp_node", "family": "control", "barrel": "single", "module": "coil"},
    {"id": "shock_coil", "family": "control", "barrel": "single", "module": "coil"},
    {"id": "gas_projector", "family": "control", "barrel": "short", "module": "canister"},

    {"id": "target_painter", "family": "support", "barrel": "single", "module": "radar"},
    {"id": "ammo_feeder", "family": "support", "barrel": "single", "module": "crate"},
    {"id": "command_uplink", "family": "support", "barrel": "single", "module": "antenna"},
    {"id": "armor_breaker", "family": "support", "barrel": "single", "module": "drill"},
    {"id": "logistics_hub", "family": "support", "barrel": "none", "module": "crate"},

    {"id": "aa_mg", "family": "aa", "barrel": "angled", "module": "radar"},
    {"id": "flak_cannon", "family": "aa", "barrel": "angled_twin", "module": "pod"},
    {"id": "sam_site", "family": "aa", "barrel": "angled", "module": "pod"},
    {"id": "laser_aa", "family": "aa", "barrel": "angled", "module": "beam"},
    {"id": "interceptor_drone", "family": "aa", "barrel": "angled", "module": "drone"},
]

BASE_STYLES = ["box", "wide", "tall", "bunker", "platform", "octa", "pillar", "ramp"]
HOUSING_STYLES = ["compact", "stacked", "offset", "dual", "ring", "slab", "tower", "capsule"]


def stable_hash(text):
    h = 0
    for ch in text:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


# ---------------------------------------------------------------- primitives
# Rays are P(s) = O + s * D. interval() returns, per ray, the [lo, hi] range of s inside
# the solid and the outward normal of the surface at s = hi. For view rays the camera
# sits at s = +inf, so hi is the visible surface.

INF = np.inf


class Convex:
    """Intersection of half-spaces n . P <= d (boxes, prisms, frustums)."""

    def __init__(self, planes, mat):
        self.planes = [(np.asarray(n, float), float(d)) for n, d in planes]
        self.mat = mat

    def interval(self, O, D):
        count = O.shape[0]
        lo = np.full(count, -INF)
        hi = np.full(count, INF)
        nrm = np.zeros((count, 3))
        for n, d in self.planes:
            nd = float(n @ D)
            no = O @ n
            if abs(nd) < 1e-9:
                lo[no > d] = INF
                continue
            t = (d - no) / nd
            if nd > 0:
                upd = t < hi
                hi = np.where(upd, t, hi)
                nrm[upd] = n
            else:
                lo = np.maximum(lo, t)
        return lo, hi, nrm


def box(x0, y0, z0, x1, y1, z1, mat):
    return Convex([((1, 0, 0), x1), ((-1, 0, 0), -x0), ((0, 1, 0), y1),
                   ((0, -1, 0), -y0), ((0, 0, 1), z1), ((0, 0, -1), -z0)], mat)


def prism(cx, cy, apothem, z0, z1, sides, mat, taper=0.0, rot=0.0):
    """Regular prism around a vertical axis; taper > 0 narrows the top (frustum)."""
    k = apothem * taper / (z1 - z0)
    planes = [((0, 0, 1), z1), ((0, 0, -1), -z0)]
    for i in range(sides):
        a = math.radians(rot) + 2 * math.pi * i / sides
        c, s = math.cos(a), math.sin(a)
        planes.append(((c, s, k), apothem + c * cx + s * cy + k * z0))
    return Convex(planes, mat)


class Cyl:
    """Finite cylinder around any axis: centre c, unit axis a, radius r, half length h."""

    def __init__(self, c, a, r, h, mat):
        self.c = np.asarray(c, float)
        a = np.asarray(a, float)
        self.a = a / np.linalg.norm(a)
        self.r, self.h, self.mat = r, h, mat

    def interval(self, O, D):
        a, r, h = self.a, self.r, self.h
        w = O - self.c
        Da = float(D @ a)
        wa = w @ a
        dp = D - Da * a
        wp = w - wa[:, None] * a
        A = float(dp @ dp)
        if A < 1e-12:
            inside = (wp * wp).sum(1) <= r * r
            s1 = np.where(inside, -INF, INF)
            s2 = np.where(inside, INF, -INF)
        else:
            B = 2 * (wp @ dp)
            C = (wp * wp).sum(1) - r * r
            disc = B * B - 4 * A * C
            ok = disc >= 0
            sq = np.sqrt(np.maximum(disc, 0))
            s1 = np.where(ok, (-B - sq) / (2 * A), INF)
            s2 = np.where(ok, (-B + sq) / (2 * A), -INF)
        if abs(Da) < 1e-12:
            inslab = np.abs(wa) <= h
            c1 = np.where(inslab, -INF, INF)
            c2 = np.where(inslab, INF, -INF)
        else:
            ta = (-h - wa) / Da
            tb = (h - wa) / Da
            c1, c2 = np.minimum(ta, tb), np.maximum(ta, tb)
        lo = np.maximum(s1, c1)
        hi = np.minimum(s2, c2)
        hs = np.where(np.isfinite(hi), hi, 0.0)
        P = O + hs[:, None] * D - self.c
        radial = P - (P @ a)[:, None] * a
        ln = np.linalg.norm(radial, axis=1, keepdims=True)
        radial = radial / np.maximum(ln, 1e-9)
        cap = np.sign(Da) * a
        nrm = np.where((s2 <= c2)[:, None], radial, cap)
        return lo, hi, nrm


def vcyl(cx, cy, z0, z1, r, mat):
    return Cyl((cx, cy, (z0 + z1) / 2), (0, 0, 1), r, (z1 - z0) / 2, mat)


def rod(p0, p1, r, mat):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    return Cyl((p0 + p1) / 2, p1 - p0, r, np.linalg.norm(p1 - p0) / 2, mat)


class Dome:
    """Sphere, optionally cut below z = c.z + cut."""

    def __init__(self, c, r, mat, cut=None):
        self.c = np.asarray(c, float)
        self.r, self.mat, self.cut = r, mat, cut

    def interval(self, O, D):
        w = O - self.c
        A = float(D @ D)
        B = 2 * (w @ D)
        C = (w * w).sum(1) - self.r * self.r
        disc = B * B - 4 * A * C
        ok = disc >= 0
        sq = np.sqrt(np.maximum(disc, 0))
        lo = np.where(ok, (-B - sq) / (2 * A), INF)
        hi = np.where(ok, (-B + sq) / (2 * A), -INF)
        if self.cut is not None and abs(D[2]) > 1e-9:
            t = (self.c[2] + self.cut - O[:, 2]) / D[2]
            if D[2] > 0:
                lo = np.maximum(lo, t)
            else:
                hi = np.minimum(hi, t)
        hs = np.where(np.isfinite(hi), hi, 0.0)
        P = O + hs[:, None] * D - self.c
        nrm = P / np.maximum(np.linalg.norm(P, axis=1, keepdims=True), 1e-9)
        return lo, hi, nrm


# ---------------------------------------------------------------- tower designs

def plinth_shapes(style):
    """Returns (shape(z0, z1, grow, mat), extra_height). The shape is the plinth's top tier."""
    if style == "box":
        return (lambda z0, z1, g, m: box(2 - g, 2 - g, z0, 10 + g, 10 + g, z1, m)), 0.0
    if style == "wide":
        return (lambda z0, z1, g, m: box(1.5 - g, 2.5 - g, z0, 10.5 + g, 9.5 + g, z1, m)), 0.0
    if style == "tall":
        return (lambda z0, z1, g, m: box(2.6 - g, 2.6 - g, z0, 9.6 + g, 9.6 + g, z1, m)), 0.8
    if style == "bunker":
        return (lambda z0, z1, g, m: prism(6, 6, 4.6 + g, z0, z1, 4, m, taper=0.18)), 0.0
    if style == "platform":
        return (lambda z0, z1, g, m: box(2.4 - g, 2.4 - g, max(z0, 0.8), 9.6 + g, 9.6 + g, z1, m)), 0.4
    if style == "octa":
        return (lambda z0, z1, g, m: prism(6, 6, 4.5 + g, z0, z1, 8, m, rot=22.5)), 0.0
    if style == "pillar":
        return (lambda z0, z1, g, m: vcyl(6, 6, z0, z1, 4.4 + g, m)), 0.0
    if style == "ramp":
        return (lambda z0, z1, g, m: box(2.8 - g, 2.8 - g, z0, 9.2 + g, 9.2 + g, z1, m)), 0.4
    raise ValueError(style)


def build_plinth(P, style, lv):
    shape, extra = plinth_shapes(style)
    H = [1.6, 2.0, 2.4, 2.8, 3.2][lv - 1] + extra
    if style == "platform":
        for fx, fy in ((1.2, 1.2), (1.2, 9.2), (9.2, 1.2), (9.2, 9.2)):
            P.append(box(fx, fy, 0, fx + 1.6, fy + 1.6, 1.2, "dark"))
    if style == "ramp":
        P.append(box(1.4, 1.4, 0, 10.6, 10.6, H * 0.45, "base"))
    P.append(shape(0, H, 0, "base"))
    if lv >= 2:
        P.append(shape(H - 1.0, H, 0.05, "trim"))
    if lv >= 4:
        # Reinforced skirt around the foot of the plinth.
        P.append(shape(0, 0.9, 0.55, "dark"))
    return H


BX, BY = 6.0, 6.0  # body centre


def build_body(P, style, zp, lv):
    """Returns (top z, glow band builder) for the housing."""
    if style == "compact":
        P.append(box(4, 4, zp, 8.4, 8.4, zp + 4.4, "body"))
        top, band = zp + 4.4, (lambda z, m: box(3.95, 3.95, z, 8.45, 8.45, z + 1.0, m))
    elif style == "stacked":
        P.append(box(3.8, 3.8, zp, 8.6, 8.6, zp + 3.0, "body"))
        P.append(box(4.6, 4.6, zp + 3.0, 7.8, 7.8, zp + 5.2, "body"))
        top, band = zp + 5.2, (lambda z, m: box(3.75, 3.75, z, 8.65, 8.65, z + 1.0, m))
    elif style == "offset":
        P.append(box(3.6, 4.2, zp, 8.2, 8.6, zp + 3.4, "body"))
        P.append(box(4.0, 4.8, zp + 3.4, 6.6, 7.8, zp + 5.0, "body"))
        top, band = zp + 5.0, (lambda z, m: box(3.55, 4.15, z, 8.25, 8.65, z + 1.0, m))
    elif style == "dual":
        P.append(box(4, 3.2, zp, 8, 5.4, zp + 4.4, "body"))
        P.append(box(4, 6.6, zp, 8, 8.8, zp + 4.4, "body"))
        P.append(box(4.4, 5.4, zp, 7.6, 6.6, zp + 3.4, "dark"))
        top, band = zp + 4.4, (lambda z, m: box(3.95, 3.15, z, 8.05, 8.85, z + 1.0, m))
    elif style == "ring":
        P.append(vcyl(BX, BY, zp, zp + 4.0, 2.8, "body"))
        P.append(vcyl(BX, BY, zp + 4.0, zp + 4.6, 3.2, "dark"))
        top, band = zp + 4.6, (lambda z, m: vcyl(BX, BY, z, z + 1.0, 2.85, m))
    elif style == "slab":
        P.append(box(3, 3.6, zp, 9, 8.4, zp + 3.4, "body"))
        top, band = zp + 3.4, (lambda z, m: box(2.95, 3.55, z, 9.05, 8.45, z + 1.0, m))
    elif style == "tower":
        P.append(box(4.4, 4.4, zp, 7.8, 7.8, zp + 6.0, "body"))
        top, band = zp + 6.0, (lambda z, m: box(4.35, 4.35, z, 7.85, 7.85, z + 1.0, m))
    elif style == "capsule":
        P.append(vcyl(BX, BY, zp, zp + 3.4, 2.7, "body"))
        P.append(Dome((BX, BY, zp + 3.4), 2.7, "body", cut=0))
        top, band = zp + 4.6, (lambda z, m: vcyl(BX, BY, z, z + 1.0, 2.75, m))
    else:
        raise ValueError(style)
    if lv >= 2 and style not in ("ring", "capsule"):
        # Side armour plates on the lit (+y) face.
        P.append(box(4.4, 8.4 if style != "dual" else 8.8, zp + 0.5, 7.8, 9.0 if style != "dual" else 9.3, zp + 2.6, "dark"))
    return top, band


def barrel_list(kind, lv):
    """Barrel tubes as (dy, dz, length, radius, elevation_deg)."""
    thick = 1.15 if lv >= 2 else 1.0
    extra = lv >= 5
    if kind == "single":
        out = [(0, 0, 8.0, 0.8 * thick, 0)]
        if extra:
            out += [(-1.4, 0, 5.6, 0.5, 0), (1.4, 0, 5.6, 0.5, 0)]
    elif kind == "short":
        out = [(0, 0, 6.0, 1.05 * thick, 0)]
        if extra:
            out += [(-1.6, 0, 4.4, 0.6, 0), (1.6, 0, 4.4, 0.6, 0)]
    elif kind == "long":
        out = [(0, 0, 9.4, 0.7 * thick, 0)]
        if extra:
            out += [(-1.3, 0, 6.2, 0.45, 0), (1.3, 0, 6.2, 0.45, 0)]
    elif kind == "wide":
        out = [(0, 0, 6.6, 1.3 * thick, 0)]
        if extra:
            out += [(-1.9, -0.2, 4.6, 0.7, 0), (1.9, -0.2, 4.6, 0.7, 0)]
    elif kind == "tube":
        out = [(0, 0, 5.6, 1.15 * thick, 55)]
        if extra:
            out += [(-2.1, -0.8, 4.4, 0.8, 55), (2.1, -0.8, 4.4, 0.8, 55)]
    elif kind == "triple":
        r = 0.5 * thick
        out = [(-0.95, 0, 7.2, r, 0), (0.95, 0, 7.2, r, 0), (0, 0.9, 7.2, r, 0)]
        if extra:
            out += [(0, -0.8, 6.6, r, 0)]
    elif kind == "angled":
        out = [(0, 0, 7.2, 0.65 * thick, 42)]
        if extra:
            out += [(-1.5, 0, 5.4, 0.5, 42), (1.5, 0, 5.4, 0.5, 42)]
    elif kind == "angled_twin":
        out = [(-1.0, 0, 6.8, 0.6 * thick, 42), (1.0, 0, 6.8, 0.6 * thick, 42)]
        if extra:
            out += [(-2.3, -0.3, 5.0, 0.5, 42), (2.3, -0.3, 5.0, 0.5, 42)]
    else:
        out = []
    return out


def build_weapon(P, kind, zw, lv):
    """Barrels point along +x (towards the lower right of the screen). Returns muzzle points."""
    tips = []
    if kind == "pod":
        n = 2 if lv < 4 else 3
        P.append(box(BX - 1.6, BY - 2.0, zw - 1.2, BX + 2.0, BY + 2.0, zw + 1.0 + 0.5 * (lv >= 5), "body"))
        for j in range(n):
            for k in range(2 + (lv >= 5)):
                y = BY - 1.2 + j * (2.4 / (n - 1))
                z = zw - 0.6 + k * 1.0
                P.append(rod((BX + 2.0, y, z), (BX + 2.6, y, z), 0.42, "warhead"))
        P.append(box(BX - 1.0, BY - 1.0, zw - 2.2, BX + 1.0, BY + 1.0, zw - 1.2, "dark"))
        return [(BX + 2.6, BY, zw)]
    for i, (dy, dz, length, r, elev) in enumerate(barrel_list(kind, lv)):
        e = math.radians(elev)
        d = np.array([math.cos(e), 0, math.sin(e)])
        p0 = np.array([BX + 0.5, BY + dy, zw + dz])
        p1 = p0 + d * length
        P.append(rod(p0, p1, r, "gun"))
        if lv >= 2 and i == 0:
            P.append(rod(p1 - d * 0.7, p1, r + 0.3, "trim"))
        tips.append(tuple(p1))
    if kind != "none":
        # Mantlet where the barrels leave the housing.
        P.append(box(BX + 1.4, BY - 1.3, zw - 1.0, BX + 2.4, BY + 1.3, zw + 1.0, "dark"))
    return tips


def build_module(P, module, zp, top, zw, lv, tips):
    if lv < 3:
        return
    m = lv - 2  # 1..3
    if module == "ammo":
        P.append(box(BX - 1.6, 9.2, zp, BX + 1.2, 10.6, zp + 1.8, "accent"))
        if lv >= 4:
            P.append(box(BX + 1.2, 8.6, zp + 1.2, BX + 2.0, 9.4, zw, "accent"))
        if lv >= 5:
            P.append(box(BX - 1.4, 9.3, zp + 1.8, BX + 1.0, 10.5, zp + 3.0, "accent"))
    elif module == "shield":
        h = [2.6, 3.2, 3.8][m - 1]
        w = [2.6, 3.0, 3.4][m - 1]
        P.append(box(BX + 2.5, BY - w, zw - 1.4, BX + 3.0, BY + w, zw - 1.4 + h, "accent"))
    elif module == "coil":
        for x0, y0, z0 in tips[:1]:
            for i in range(m + 1):
                x = BX + 2.6 + i * 1.5
                if x > x0 - 0.6:
                    break
                P.append(rod((x, y0, z0), (x + 0.6, y0, z0), 1.15, "accent" if lv < 5 else "core"))
    elif module == "canister":
        for i in range(m):
            cx = BX - 1.6 + i * 1.7
            P.append(vcyl(cx, 9.6, zp, zp + 2.6, 0.8, "accent"))
            P.append(vcyl(cx, 9.6, zp + 2.6, zp + 3.0, 0.45, "dark"))
    elif module == "radar":
        mx, my = 3.6, 8.4
        mast = top + 2.0 + 0.6 * m
        P.append(vcyl(mx, my, zp, mast, 0.3, "dark"))
        r = [1.5, 1.9, 2.2][m - 1]
        P.append(Cyl((mx + 0.4, my + 0.4, mast), (1, 1, 1.2), r, 0.22, "accent"))
        if lv >= 5:
            P.append(Dome((mx, my, mast + 0.9), 0.45, "core"))
    elif module == "crate":
        spots = [(2.6, 8.0), (8.0, 2.6), (8.2, 8.2)]
        for cx, cy in spots[:m]:
            P.append(box(cx - 0.9, cy - 0.9, zp, cx + 0.9, cy + 0.9, zp + 1.8, "accent"))
            P.append(box(cx - 0.95, cy - 0.95, zp + 0.75, cx + 0.95, cy + 0.95, zp + 1.05, "dark"))
    elif module == "antenna":
        spots = [(4.4, 7.6), (4.4, 4.4), (7.6, 4.4)]
        for i, (ax, ay) in enumerate(spots[:m]):
            ztop = top + 4.0 - i * 0.8
            P.append(vcyl(ax, ay, top - 0.2, ztop, 0.25, "dark"))
            P.append(Dome((ax, ay, ztop), 0.45, "core" if lv >= 5 else "accent"))
    elif module == "pod":
        sides = [8.8] if lv < 4 else [8.8, 1.6]
        for y0 in sides:
            P.append(box(BX - 0.8, y0, zw - 1.0, BX + 1.8, y0 + 1.6, zw + 0.8, "dark"))
            for k in range(1 + (lv >= 5)):
                P.append(rod((BX + 1.8, y0 + 0.8, zw - 0.5 + k * 0.9), (BX + 2.3, y0 + 0.8, zw - 0.5 + k * 0.9), 0.4, "warhead"))
    elif module == "drill":
        for x0, y0, z0 in tips[:1]:
            for i, r in enumerate([1.1, 0.85, 0.6, 0.35][: m + 1]):
                P.append(rod((x0 + i * 0.6, y0, z0), (x0 + i * 0.6 + 0.6, y0, z0), r, "accent"))
    elif module == "drone":
        pads = [(2.8, 8.2), (8.2, 2.8), (2.8, 3.4)]
        for px, py in pads[: min(m, 2)]:
            P.append(vcyl(px, py, zp, zp + 0.4, 1.4, "accent" if lv < 5 else "core"))
            P.append(vcyl(px, py, zp, zp + 0.5, 0.6, "dark"))
    elif module == "beam":
        r = [0.8, 1.0, 1.2][m - 1]
        for x0, y0, z0 in tips[:1]:
            P.append(Dome((x0, y0, z0), r, "core"))
    elif module == "scope":
        length = [2.6, 3.2, 3.6][m - 1]
        P.append(box(BX - 0.4, BY - 0.5, top, BX - 0.4 + length, BY + 0.5, top + 0.9, "dark"))
        P.append(box(BX - 0.4 + length, BY - 0.4, top + 0.1, BX + length, BY + 0.4, top + 0.8, "core"))
    elif module == "tube":
        # Spare rounds rack on the lit side.
        for i in range(m):
            P.append(rod((BX - 1.6 + i * 1.2, 9.6, zp + 0.5), (BX - 1.6 + i * 1.2, 9.6, zp + 2.4), 0.5, "accent"))


def build_tower(tower, lv):
    h = stable_hash(tower["id"])
    base_style = BASE_STYLES[h % len(BASE_STYLES)]
    housing = HOUSING_STYLES[(h >> 3) % len(HOUSING_STYLES)]
    pal = PALETTES[tower["family"]]
    mats = {
        "base": (mix(hex_to_rgb(pal["base"]), (140, 138, 128), 0.75), False),
        "body": (hex_to_rgb(pal["body"]), False),
        "dark": (hex_to_rgb(pal["barrel"]), False),
        "gun": ((62, 66, 74), False),
        "warhead": ((200, 70, 60), False),
        "accent": (hex_to_rgb(pal["accent"]), False),
        "core": (mix(hex_to_rgb(pal["accent"]), (255, 255, 255), 0.35), True),
        "trim": (hex_to_rgb(TIER[lv] or pal["base"]), False),
        "elite": (mix(hex_to_rgb(TIER[5]), (255, 255, 255), 0.25), True),
    }
    P = []
    zp = build_plinth(P, base_style, lv)
    top, band = build_body(P, housing, zp, lv)
    zw = top - 1.1
    tips = build_weapon(P, tower["barrel"], zw, lv)
    build_module(P, tower["module"], zp, top, zw, lv, tips)
    if lv >= 4:
        P.append(band(zp + 1.0, "elite" if lv >= 5 else "trim"))
    return P, mats


# ---------------------------------------------------------------- rendering

def shade(rgb, tone):
    """tone 0 (deep shade) .. 3 (highlight)."""
    if tone == 0:
        return mix(rgb, SHADE_COOL, 0.5)
    if tone == 1:
        return mix(rgb, SHADE_COOL, 0.25)
    if tone == 2:
        return rgb
    return mix(rgb, SHADE_WARM, 0.2)


def render(prims, mats):
    n = SIZE * SS
    coords = (np.arange(n) + 0.5) / SS
    px, py = np.meshgrid(coords, coords)
    u = px.ravel() - CX
    v = py.ravel() - CY
    O = np.stack([u / 2, -u / 2, -v], axis=1)
    D = np.array([1.0, 1.0, 1.0])

    best = np.full(O.shape[0], -INF)
    nrm = np.zeros_like(O)
    pid = np.full(O.shape[0], -1)
    for i, p in enumerate(prims):
        lo, hi, nr = p.interval(O, D)
        hit = (lo <= hi) & np.isfinite(hi) & (hi > best)
        best[hit] = hi[hit]
        nrm[hit] = nr[hit]
        pid[hit] = i
    hit = pid >= 0

    nrm = nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    ndl = nrm @ LIGHT
    tone = np.select([ndl >= 0.62, ndl >= 0.3, ndl >= -0.05], [3, 2, 1], 0)

    # Self shadow: a surface point that cannot see the light drops to a dark tone.
    hs = np.where(hit, best, 0.0)
    pts = O + hs[:, None] * D + nrm * 0.05
    blocked = np.zeros(O.shape[0], bool)
    for p in prims:
        lo, hi, _ = p.interval(pts, LIGHT)
        blocked |= (lo <= hi) & (hi > 1e-3)
    tone = np.where(hit & blocked, np.minimum(tone, 1), tone)

    # Ground shadow for rays that reach the ground (z = 0).
    ground = O + v[:, None] * D
    gshadow = np.zeros(O.shape[0], bool)
    for p in prims:
        lo, hi, _ = p.interval(ground, LIGHT)
        gshadow |= (lo <= hi) & (hi > 1e-3)
    gshadow &= ~hit

    emissive = np.array([mats[p.mat][1] for p in prims] + [False])
    tone = np.where(hit & emissive[pid], 3, tone)

    key = np.where(hit, pid * 4 + tone, np.where(gshadow, -2, -1))
    key = key.reshape(SIZE, SS, SIZE, SS).transpose(0, 2, 1, 3).reshape(SIZE, SIZE, SS * SS)
    depth = np.where(hit, best, -INF).reshape(SIZE, SS, SIZE, SS).transpose(0, 2, 1, 3).reshape(SIZE, SIZE, SS * SS)

    rgba = np.zeros((SIZE, SIZE, 4), np.uint8)
    solid = np.zeros((SIZE, SIZE), bool)
    zbuf = np.full((SIZE, SIZE), -INF)
    owner = np.full((SIZE, SIZE), -1)
    for y in range(SIZE):
        for x in range(SIZE):
            ks = key[y, x]
            vals, counts = np.unique(ks, return_counts=True)
            solid_mask = vals >= 0
            cover = counts[solid_mask].sum() / ks.size
            if cover >= 0.4:
                sv, sc = vals[solid_mask], counts[solid_mask]
                k = int(sv[np.argmax(sc)])
                p, t = divmod(k, 4)
                rgb, emit = mats[prims[p].mat]
                col = rgb if emit else shade(rgb, t)
                rgba[y, x] = (*col, 255)
                solid[y, x] = True
                zbuf[y, x] = depth[y, x][ks == k].mean()
                owner[y, x] = p
            elif (ks == -2).sum() + counts[solid_mask].sum() >= ks.size * 0.5:
                rgba[y, x] = (0, 0, 0, SHADOW_ALPHA)

    # Contour lines where a nearer part overlaps a farther one (drawn on the far pixel).
    line = rgba.copy()
    for y in range(SIZE):
        for x in range(SIZE):
            if not solid[y, x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < SIZE and 0 <= ny < SIZE and solid[ny, nx] and owner[ny, nx] != owner[y, x] \
                        and zbuf[ny, nx] > zbuf[y, x] + 2.5:
                    line[y, x, :3] = mix(tuple(int(c) for c in rgba[ny, nx, :3]), SHADE_COOL, 0.7)
                    break
    rgba = line

    # 1px outer outline in a dark version of the neighbouring colour.
    out = rgba.copy()
    for y in range(SIZE):
        for x in range(SIZE):
            if solid[y, x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < SIZE and 0 <= ny < SIZE and solid[ny, nx]:
                    out[y, x] = (*mix(tuple(int(c) for c in rgba[ny, nx, :3]), (12, 14, 18), 0.78), 255)
                    break
    return out


def to_svg(rgba):
    rects = []
    for y in range(SIZE):
        x = 0
        while x < SIZE:
            px = tuple(int(c) for c in rgba[y, x])
            if px[3] == 0:
                x += 1
                continue
            run = 1
            while x + run < SIZE and tuple(int(c) for c in rgba[y, x + run]) == px:
                run += 1
            fill = "#{:02X}{:02X}{:02X}".format(*px[:3])
            op = "" if px[3] == 255 else f' fill-opacity="{px[3] / 255:.2f}"'
            rects.append(f'<rect x="{x}" y="{y}" width="{run}" height="1" fill="{fill}"{op}/>')
            x += run
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<svg width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}" '
        'xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
        f'{"".join(rects)}</svg>'
    )


def main():
    png_dir = os.path.join("src", "assets", "sprites", "towers")
    svg_dir = os.path.join("art", "towers")
    os.makedirs(png_dir, exist_ok=True)
    os.makedirs(svg_dir, exist_ok=True)
    for tower in TOWERS:
        for lv in range(1, 6):
            prims, mats = build_tower(tower, lv)
            rgba = render(prims, mats)
            name = f"{tower['id']}_l{lv}"
            Image.fromarray(rgba, "RGBA").save(os.path.join(png_dir, name + ".png"))
            with open(os.path.join(svg_dir, name + ".svg"), "w", encoding="utf-8") as f:
                f.write(to_svg(rgba))
    print(f"Generated {len(TOWERS) * 5} isometric tower sprites ({len(TOWERS)} towers x 5 levels)")


if __name__ == "__main__":
    main()
