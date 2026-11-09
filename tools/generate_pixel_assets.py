import os

try:
    from PIL import Image, ImageDraw
    HAS_PIL = True
except Exception:
    HAS_PIL = False

SIZE = 24

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
    enemy_dir = os.path.join(svg_base, "enemies")
    tile_dir = os.path.join(svg_base, "tiles")
    ui_dir = os.path.join(svg_base, "ui")

    enemy_png_dir = os.path.join(png_base, "enemies")
    tile_png_dir = os.path.join(png_base, "tiles")
    ui_png_dir = os.path.join(png_base, "ui")

    # Towers are isometric and come from tools/generate_tower_assets.py.

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
    print("- Towers: see tools/generate_tower_assets.py")
    print(f"- Enemies: {len(ENEMIES)} types")
    print("- Tiles: 6")
    print(f"- UI icons: {11 - len(UI_OWNED_ELSEWHERE)} (the rest belong to generate_ui_assets.py)")


if __name__ == "__main__":
    main()
