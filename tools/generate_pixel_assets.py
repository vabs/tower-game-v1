import os

try:
    from PIL import Image, ImageDraw
    HAS_PIL = True
except Exception:
    HAS_PIL = False

SIZE = 24

PALETTES = {
    "assault": {"base": "#556B2F", "body": "#6B8E23", "barrel": "#2F3B1E", "accent": "#C2B280"},
    "precision": {"base": "#4C566A", "body": "#5E81AC", "barrel": "#2E3440", "accent": "#88C0D0"},
    "explosive": {"base": "#8D6E63", "body": "#A1887F", "barrel": "#4E342E", "accent": "#D4A373"},
    "control": {"base": "#37474F", "body": "#607D8B", "barrel": "#263238", "accent": "#4DD0E1"},
    "support": {"base": "#7C6F57", "body": "#9E9D24", "barrel": "#5D4037", "accent": "#F9A825"},
    "aa": {"base": "#455A64", "body": "#607D8B", "barrel": "#263238", "accent": "#64B5F6"},
}

ENEMY_PALETTES = {
    "infantry": {"body": "#6B7B5A", "accent": "#A0B08B"},
    "fast": {"body": "#7C8C6B", "accent": "#C2B280"},
    "bruiser": {"body": "#5A6B52", "accent": "#8E9B86"},
    "heavy": {"body": "#3F4B36", "accent": "#6A7A5F"},
    "tank": {"body": "#2F3A2A", "accent": "#556B4A"},
    "air": {"body": "#4A6A8A", "accent": "#88AACC"},
    "air_heavy": {"body": "#2C3E50", "accent": "#6C7A89"},
    "stealth": {"body": "#2B2F36", "accent": "#5C646E"},
}

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

ENEMIES = [
    {"id": "grunt", "kind": "infantry"},
    {"id": "runner", "kind": "fast"},
    {"id": "bruiser", "kind": "bruiser"},
    {"id": "heavy", "kind": "heavy"},
    {"id": "scout", "kind": "fast"},
    {"id": "skirmisher", "kind": "infantry"},
    {"id": "trooper", "kind": "infantry"},
    {"id": "breaker", "kind": "bruiser"},
    {"id": "tank", "kind": "tank"},
    {"id": "bulldozer", "kind": "tank"},
    {"id": "crawler", "kind": "fast"},
    {"id": "raider", "kind": "fast"},
    {"id": "vanguard", "kind": "heavy"},
    {"id": "marauder", "kind": "bruiser"},
    {"id": "drone", "kind": "air"},
    {"id": "jet", "kind": "air"},
    {"id": "bomber", "kind": "air_heavy"},
    {"id": "gunship", "kind": "air_heavy"},
    {"id": "sky_tank", "kind": "air_heavy"},
    {"id": "stealth_copter", "kind": "stealth"},
]

SIGNATURES = []
for y in [5, 6, 7, 8, 9, 10]:
    for x in [2, 3, 4, 19, 20, 21]:
        SIGNATURES.append((x, y))


def stable_hash(text):
    h = 0
    for ch in text:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


BASE_STYLES = [
    "box",
    "wide",
    "tall",
    "bunker",
    "platform",
    "octa",
    "pillar",
    "ramp",
]

HOUSING_STYLES = [
    "compact",
    "stacked",
    "offset",
    "dual",
    "ring",
    "slab",
    "tower",
    "capsule",
]


def rects_to_svg(rects):
    body = ''.join(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>'
        for (x, y, w, h, c) in rects
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f'<svg width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}" '
        'xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
        f'{body}</svg>'
    )


def save_svg(path, rects):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(rects_to_svg(rects))


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def adjust_channel(ch, factor):
    return max(0, min(255, int(ch * factor)))


def rgb_to_hex(rgb):
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def adjust_color(color, factor):
    r, g, b = hex_to_rgb(color)
    return rgb_to_hex(
        (
            adjust_channel(r, factor),
            adjust_channel(g, factor),
            adjust_channel(b, factor),
        )
    )


def save_png(path, rects):
    if not HAS_PIL:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for x, y, w, h, color in rects:
        if isinstance(color, tuple):
            fill = color
        else:
            fill = hex_to_rgb(color) + (255,)
        draw.rectangle([x, y, x + w - 1, y + h - 1], fill=fill)
    image.save(path, "PNG")


def add_rect(rects, x, y, w, h, color):
    rects.append((x, y, w, h, color))


def add_base(rects, style, palette):
    if style == "box":
        add_rect(rects, 6, 14, 12, 7, palette["base"])
    elif style == "wide":
        add_rect(rects, 5, 14, 14, 6, palette["base"])
    elif style == "tall":
        add_rect(rects, 7, 13, 10, 8, palette["base"])
    elif style == "bunker":
        add_rect(rects, 5, 15, 14, 6, palette["base"])
        add_rect(rects, 6, 13, 12, 2, palette["barrel"])
    elif style == "platform":
        add_rect(rects, 6, 15, 12, 5, palette["base"])
        add_rect(rects, 4, 17, 2, 2, palette["barrel"])
        add_rect(rects, 18, 17, 2, 2, palette["barrel"])
    elif style == "octa":
        add_rect(rects, 7, 15, 10, 5, palette["base"])
        add_rect(rects, 8, 14, 8, 1, palette["base"])
        add_rect(rects, 8, 20, 8, 1, palette["barrel"])
    elif style == "pillar":
        add_rect(rects, 9, 13, 6, 9, palette["base"])
        add_rect(rects, 8, 20, 8, 1, palette["barrel"])
    elif style == "ramp":
        add_rect(rects, 6, 16, 12, 5, palette["base"])
        add_rect(rects, 7, 15, 10, 1, palette["base"])
        add_rect(rects, 8, 14, 8, 1, palette["base"])
    else:
        add_rect(rects, 6, 14, 12, 7, palette["base"])


def add_housing(rects, style, palette):
    if style == "compact":
        add_rect(rects, 8, 10, 8, 4, palette["body"])
    elif style == "stacked":
        add_rect(rects, 8, 11, 8, 3, palette["body"])
        add_rect(rects, 9, 8, 6, 3, palette["body"])
    elif style == "offset":
        add_rect(rects, 7, 10, 9, 4, palette["body"])
        add_rect(rects, 10, 8, 4, 2, palette["body"])
    elif style == "dual":
        add_rect(rects, 7, 10, 4, 4, palette["body"])
        add_rect(rects, 13, 10, 4, 4, palette["body"])
    elif style == "ring":
        add_rect(rects, 8, 10, 8, 4, palette["body"])
        add_rect(rects, 9, 11, 6, 2, palette["base"])
    elif style == "slab":
        add_rect(rects, 7, 11, 10, 3, palette["body"])
    elif style == "tower":
        add_rect(rects, 10, 7, 4, 7, palette["body"])
    elif style == "capsule":
        add_rect(rects, 8, 9, 8, 5, palette["body"])
        add_rect(rects, 9, 8, 6, 1, palette["body"])
    else:
        add_rect(rects, 8, 10, 8, 4, palette["body"])


def add_signature_blocks(rects, tower_id, level, accent):
    h = stable_hash(tower_id)
    count = min(5, level)
    for i in range(count):
        idx = (h + i * 13) % len(SIGNATURES)
        x, y = SIGNATURES[idx]
        add_rect(rects, x, y, 1, 1, accent)


def contrast_palette(palette):
    return {
        "base": adjust_color(palette["base"], 0.75),
        "body": adjust_color(palette["body"], 0.9),
        "barrel": adjust_color(palette["barrel"], 0.65),
        "accent": adjust_color(palette["accent"], 1.2),
    }


def add_upgrade_armor(rects, level, palette):
    if level >= 2:
        add_rect(rects, 5, 14, 1, 7, palette["barrel"])
        add_rect(rects, 18, 14, 1, 7, palette["barrel"])
    if level >= 4:
        add_rect(rects, 7, 9, 10, 1, palette["accent"])
    if level >= 5:
        add_rect(rects, 6, 21, 12, 1, palette["accent"])

def add_barrel(rects, style, color):
    if style == "none":
        return
    if style == "single":
        add_rect(rects, 11, 4, 2, 6, color)
    elif style == "short":
        add_rect(rects, 11, 6, 2, 4, color)
    elif style == "long":
        add_rect(rects, 11, 2, 2, 8, color)
    elif style == "wide":
        add_rect(rects, 10, 5, 4, 5, color)
    elif style == "tube":
        add_rect(rects, 10, 4, 4, 7, color)
    elif style == "twin":
        add_rect(rects, 10, 5, 1, 5, color)
        add_rect(rects, 13, 5, 1, 5, color)
    elif style == "triple":
        add_rect(rects, 9, 5, 1, 5, color)
        add_rect(rects, 11, 5, 1, 5, color)
        add_rect(rects, 13, 5, 1, 5, color)
    elif style == "angled":
        for i in range(5):
            add_rect(rects, 12 + i, 8 - i, 1, 1, color)
    elif style == "angled_twin":
        for i in range(5):
            add_rect(rects, 11 + i, 9 - i, 1, 1, color)
            add_rect(rects, 13 + i, 9 - i, 1, 1, color)
    elif style == "pod":
        add_rect(rects, 9, 6, 6, 4, color)


def add_module(rects, module, level, accent):
    if level < 3:
        return
    if module == "ammo":
        add_rect(rects, 4, 14, 3, 3, accent)
        if level >= 4:
            add_rect(rects, 4, 17, 3, 2, accent)
        if level >= 5:
            add_rect(rects, 4, 12, 3, 2, accent)
    elif module == "shield":
        add_rect(rects, 7, 12, 10, 1, accent)
        if level >= 4:
            add_rect(rects, 6, 11, 12, 1, accent)
        if level >= 5:
            add_rect(rects, 5, 10, 14, 1, accent)
    elif module == "coil":
        add_rect(rects, 10, 8, 4, 1, accent)
        add_rect(rects, 10, 10, 4, 1, accent)
        if level >= 4:
            add_rect(rects, 9, 7, 6, 1, accent)
        if level >= 5:
            add_rect(rects, 9, 11, 6, 1, accent)
    elif module == "canister":
        add_rect(rects, 17, 14, 3, 3, accent)
        if level >= 4:
            add_rect(rects, 17, 17, 3, 2, accent)
        if level >= 5:
            add_rect(rects, 17, 12, 3, 2, accent)
    elif module == "radar":
        add_rect(rects, 16, 4, 4, 1, accent)
        add_rect(rects, 17, 3, 2, 1, accent)
        if level >= 4:
            add_rect(rects, 14, 5, 6, 1, accent)
        if level >= 5:
            add_rect(rects, 15, 2, 4, 1, accent)
    elif module == "crate":
        add_rect(rects, 4, 18, 3, 3, accent)
        add_rect(rects, 17, 18, 3, 3, accent)
        if level >= 4:
            add_rect(rects, 4, 15, 3, 3, accent)
        if level >= 5:
            add_rect(rects, 17, 15, 3, 3, accent)
    elif module == "antenna":
        add_rect(rects, 12, 1, 1, 5, accent)
        if level >= 4:
            add_rect(rects, 11, 1, 1, 4, accent)
        if level >= 5:
            add_rect(rects, 13, 1, 1, 4, accent)
    elif module == "pod":
        add_rect(rects, 8, 6, 8, 4, accent)
        add_rect(rects, 9, 7, 2, 2, "#2B2B2B")
        add_rect(rects, 12, 7, 2, 2, "#2B2B2B")
        if level >= 4:
            add_rect(rects, 8, 10, 8, 2, accent)
        if level >= 5:
            add_rect(rects, 7, 5, 10, 1, accent)
    elif module == "drill":
        add_rect(rects, 11, 3, 2, 2, accent)
        add_rect(rects, 10, 2, 4, 1, accent)
        if level >= 4:
            add_rect(rects, 9, 1, 6, 1, accent)
        if level >= 5:
            add_rect(rects, 10, 0, 4, 1, accent)
    elif module == "drone":
        add_rect(rects, 10, 6, 4, 1, accent)
        add_rect(rects, 9, 7, 6, 1, accent)
        if level >= 4:
            add_rect(rects, 10, 8, 4, 1, accent)
        if level >= 5:
            add_rect(rects, 8, 9, 8, 1, accent)
    elif module == "beam":
        add_rect(rects, 11, 3, 2, 2, accent)
        add_rect(rects, 10, 2, 4, 1, accent)
        if level >= 4:
            add_rect(rects, 10, 1, 4, 1, accent)
        if level >= 5:
            add_rect(rects, 9, 0, 6, 1, accent)
    elif module == "scope":
        add_rect(rects, 9, 8, 6, 1, accent)
        add_rect(rects, 11, 7, 2, 1, accent)
        if level >= 4:
            add_rect(rects, 8, 7, 8, 1, accent)
        if level >= 5:
            add_rect(rects, 10, 6, 4, 1, accent)


def add_upgrade_weapons(rects, style, level, color):
    if level < 5:
        return
    if style in ("single", "short", "long"):
        add_rect(rects, 9, 6, 1, 5, color)
        add_rect(rects, 14, 6, 1, 5, color)
    elif style in ("wide", "tube"):
        add_rect(rects, 9, 3, 2, 3, color)
        add_rect(rects, 13, 3, 2, 3, color)
    elif style == "pod":
        add_rect(rects, 8, 5, 8, 1, color)
    elif style in ("angled", "angled_twin"):
        add_rect(rects, 14, 4, 1, 1, color)


def add_capstone(rects, tower, palette, level):
    if level < 5:
        return
    family = tower["family"]
    if family == "assault":
        add_rect(rects, 6, 11, 3, 3, palette["accent"])
        add_rect(rects, 15, 11, 3, 3, palette["accent"])
        add_rect(rects, 10, 7, 4, 2, palette["barrel"])
    elif family == "precision":
        add_rect(rects, 9, 1, 6, 2, palette["accent"])
        add_rect(rects, 12, 0, 1, 2, palette["accent"])
    elif family == "explosive":
        add_rect(rects, 7, 6, 3, 3, palette["accent"])
        add_rect(rects, 14, 6, 3, 3, palette["accent"])
        add_rect(rects, 9, 4, 6, 2, palette["barrel"])
    elif family == "control":
        add_rect(rects, 10, 5, 4, 4, palette["accent"])
        add_rect(rects, 11, 4, 2, 1, palette["accent"])
    elif family == "support":
        add_rect(rects, 11, 1, 2, 6, palette["accent"])
        add_rect(rects, 10, 2, 4, 1, palette["accent"])
    elif family == "aa":
        add_rect(rects, 16, 2, 4, 1, palette["accent"])
        add_rect(rects, 17, 1, 2, 1, palette["accent"])
        add_rect(rects, 8, 5, 2, 2, palette["accent"])


def draw_tower(tower, level, sig_idx):
    palette = contrast_palette(PALETTES[tower["family"]])
    rects = []
    h = stable_hash(tower["id"])
    base_style = BASE_STYLES[h % len(BASE_STYLES)]
    housing_style = HOUSING_STYLES[(h >> 3) % len(HOUSING_STYLES)]

    add_base(rects, base_style, palette)
    add_housing(rects, housing_style, palette)
    add_barrel(rects, tower["barrel"], palette["barrel"])

    add_signature_blocks(rects, tower["id"], level, palette["accent"])
    add_upgrade_armor(rects, level, palette)
    add_module(rects, tower["module"], level, palette["accent"])
    add_upgrade_weapons(rects, tower["barrel"], level, palette["barrel"])
    add_capstone(rects, tower, palette, level)

    return rects


def draw_enemy(enemy, sig_idx):
    kind = enemy["kind"]
    palette = ENEMY_PALETTES.get(kind, ENEMY_PALETTES["infantry"])
    rects = []
    if kind in ("infantry", "fast", "bruiser"):
        add_rect(rects, 9, 12, 6, 6, palette["body"])
        add_rect(rects, 11, 9, 2, 3, palette["body"])
        if kind == "fast":
            add_rect(rects, 8, 14, 2, 2, palette["accent"])
        if kind == "bruiser":
            add_rect(rects, 8, 12, 8, 6, palette["body"])
            add_rect(rects, 10, 10, 4, 2, palette["accent"])
    elif kind in ("heavy", "tank"):
        add_rect(rects, 6, 12, 12, 6, palette["body"])
        add_rect(rects, 9, 10, 6, 3, palette["accent"])
        add_rect(rects, 11, 8, 2, 3, palette["body"])
        if kind == "tank":
            add_rect(rects, 5, 13, 14, 6, palette["body"])
            add_rect(rects, 10, 9, 4, 2, palette["accent"])
    elif kind in ("air", "air_heavy", "stealth"):
        add_rect(rects, 8, 12, 8, 4, palette["body"])
        add_rect(rects, 6, 10, 12, 2, palette["accent"])
        add_rect(rects, 11, 8, 2, 2, palette["accent"])
        if kind == "air_heavy":
            add_rect(rects, 7, 14, 10, 3, palette["body"])
        if kind == "stealth":
            add_rect(rects, 7, 11, 10, 1, palette["accent"])

    sig_x, sig_y = SIGNATURES[sig_idx % len(SIGNATURES)]
    add_rect(rects, sig_x, sig_y, 1, 1, palette["accent"])

    return rects


def draw_tile(tile_id):
    rects = []
    if tile_id == "path":
        add_rect(rects, 0, 0, SIZE, SIZE, "#3E3E3E")
        add_rect(rects, 2, 2, SIZE - 4, SIZE - 4, "#4A4A4A")
        add_rect(rects, 11, 0, 2, SIZE, "#5C5C5C")
    elif tile_id == "buildable":
        add_rect(rects, 0, 0, SIZE, SIZE, "#5B5F4C")
        add_rect(rects, 2, 2, SIZE - 4, SIZE - 4, "#6A6F5A")
    elif tile_id == "blocked":
        add_rect(rects, 0, 0, SIZE, SIZE, "#3A3A3A")
        add_rect(rects, 4, 6, 6, 6, "#6B5A4A")
        add_rect(rects, 14, 10, 6, 6, "#6B5A4A")
        add_rect(rects, 8, 14, 6, 6, "#5A4A3A")
    elif tile_id == "waypoint":
        add_rect(rects, 0, 0, SIZE, SIZE, "#4F4A3C")
        add_rect(rects, 10, 4, 4, 12, "#C2B280")
        add_rect(rects, 8, 8, 8, 2, "#D4C08A")
    elif tile_id == "spawn":
        add_rect(rects, 0, 0, SIZE, SIZE, "#3A4A5A")
        add_rect(rects, 4, 4, SIZE - 8, SIZE - 8, "#4A5A6A")
        add_rect(rects, 9, 9, 6, 6, "#88AACC")
    elif tile_id == "goal":
        add_rect(rects, 0, 0, SIZE, SIZE, "#4A3A3A")
        add_rect(rects, 4, 4, SIZE - 8, SIZE - 8, "#5A4A4A")
        add_rect(rects, 8, 8, 8, 8, "#B04040")
    return rects


def draw_ui_icon(icon_id):
    rects = []
    if icon_id == "medal_bronze":
        add_rect(rects, 6, 6, 12, 12, "#A97142")
        add_rect(rects, 10, 10, 4, 4, "#6E4B2A")
    elif icon_id == "medal_silver":
        add_rect(rects, 6, 6, 12, 12, "#B0B5BD")
        add_rect(rects, 10, 10, 4, 4, "#7C8794")
    elif icon_id == "medal_gold":
        add_rect(rects, 6, 6, 12, 12, "#D4AF37")
        add_rect(rects, 10, 10, 4, 4, "#A07C24")
    elif icon_id == "lock":
        add_rect(rects, 8, 12, 8, 8, "#8A8A8A")
        add_rect(rects, 10, 8, 4, 4, "#6B6B6B")
    elif icon_id == "crate":
        add_rect(rects, 6, 8, 12, 10, "#9C6B3D")
        add_rect(rects, 6, 12, 12, 2, "#7A4E2A")
    elif icon_id == "air_chevron":
        add_rect(rects, 10, 6, 4, 2, "#64B5F6")
        add_rect(rects, 9, 8, 6, 2, "#64B5F6")
        add_rect(rects, 8, 10, 8, 2, "#64B5F6")
    elif icon_id == "radar":
        add_rect(rects, 6, 6, 12, 12, "#3E4E5E")
        add_rect(rects, 8, 8, 8, 8, "#6A7A8A")
        add_rect(rects, 11, 4, 2, 2, "#88AACC")
    elif icon_id == "coin":
        add_rect(rects, 7, 7, 10, 10, "#D4AF37")
        add_rect(rects, 9, 9, 6, 6, "#A07C24")
    elif icon_id == "heart":
        add_rect(rects, 8, 8, 8, 8, "#B04040")
        add_rect(rects, 10, 10, 4, 4, "#6B2C2C")
    elif icon_id == "pause":
        add_rect(rects, 8, 6, 3, 12, "#C2B280")
        add_rect(rects, 13, 6, 3, 12, "#C2B280")
    elif icon_id == "play":
        add_rect(rects, 9, 6, 2, 12, "#C2B280")
        add_rect(rects, 11, 8, 2, 8, "#C2B280")
        add_rect(rects, 13, 10, 2, 4, "#C2B280")
    return rects


UI_OWNED_ELSEWHERE = {"medal_bronze", "medal_silver", "medal_gold", "lock", "pause", "play"}


def main():
    png_base = os.path.join("src", "assets", "sprites")
    svg_base = "art"
    tower_dir = os.path.join(svg_base, "towers")
    enemy_dir = os.path.join(svg_base, "enemies")
    tile_dir = os.path.join(svg_base, "tiles")
    ui_dir = os.path.join(svg_base, "ui")

    tower_png_dir = os.path.join(png_base, "towers")
    enemy_png_dir = os.path.join(png_base, "enemies")
    tile_png_dir = os.path.join(png_base, "tiles")
    ui_png_dir = os.path.join(png_base, "ui")

    for idx, tower in enumerate(TOWERS):
        tower_id = tower["id"]
        for level in range(1, 6):
            rects = draw_tower(tower, level, idx)
            filename = f"{tower_id}_l{level}.svg"
            path = os.path.join(tower_dir, filename)
            save_svg(path, rects)
            png_name = f"{tower_id}_l{level}.png"
            png_path = os.path.join(tower_png_dir, png_name)
            save_png(png_path, rects)

    for idx, enemy in enumerate(ENEMIES):
        rects = draw_enemy(enemy, idx)
        filename = f"{enemy['id']}.svg"
        path = os.path.join(enemy_dir, filename)
        save_svg(path, rects)
        png_path = os.path.join(enemy_png_dir, f"{enemy['id']}.png")
        save_png(png_path, rects)

    for tile_id in ["path", "buildable", "blocked", "waypoint", "spawn", "goal"]:
        rects = draw_tile(tile_id)
        path = os.path.join(tile_dir, f"{tile_id}.svg")
        save_svg(path, rects)
        png_path = os.path.join(tile_png_dir, f"{tile_id}.png")
        save_png(png_path, rects)

    for icon_id in [
        "medal_bronze",
        "medal_silver",
        "medal_gold",
        "lock",
        "crate",
        "air_chevron",
        "radar",
        "coin",
        "heart",
        "pause",
        "play",
    ]:
        # tools/generate_ui_assets.py owns these files (medals, lock, pause, play): never overwrite them here.
        if icon_id in UI_OWNED_ELSEWHERE:
            continue
        rects = draw_ui_icon(icon_id)
        path = os.path.join(ui_dir, f"{icon_id}.svg")
        save_svg(path, rects)
        png_path = os.path.join(ui_png_dir, f"{icon_id}.png")
        save_png(png_path, rects)


    print("Generated assets:")
    print(f"- Towers: {len(TOWERS)} types, 5 levels each")
    print(f"- Enemies: {len(ENEMIES)} types")
    print("- Tiles: 6")
    print(f"- UI icons: {11 - len(UI_OWNED_ELSEWHERE)} (the rest belong to generate_ui_assets.py)")


if __name__ == "__main__":
    main()
