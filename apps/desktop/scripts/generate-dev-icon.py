#!/usr/bin/env python3
"""Generate an icon with a colored label bar.

Usage: python3 generate-dev-icon.py <label> <base_icon_path> <output_path> [bar_color_hex]

bar_color_hex defaults to #E8622A (orange). Pass e.g. #D4A017 for yellow/gold.
"""

import sys
from PIL import Image, ImageDraw, ImageFont

BAR_HEIGHT = 250
BAR_COLOR = (232, 98, 42, 255)
TEXT_COLOR = (255, 255, 255, 255)
MAX_LABEL_LEN = 14


def parse_hex_color(hex_str: str) -> tuple[int, int, int, int]:
    """Parse #RRGGBB or RRGGBB into an RGBA tuple."""
    hex_str = hex_str.lstrip("#")
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return (r, g, b, 255)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for fp in [
        "/System/Library/Fonts/SFCompactRounded.ttf",
        "/System/Library/Fonts/SFCompact.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/Library/Fonts/Arial Bold.ttf",
    ]:
        try:
            return ImageFont.truetype(fp, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def generate(branch: str, base_path: str, output_path: str, bar_color: tuple[int, int, int, int] = BAR_COLOR) -> None:
    img = Image.open(base_path).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)

    # Draw the colored bar at the bottom
    draw.rectangle([0, h - BAR_HEIGHT, w, h], fill=bar_color)

    # Truncate long branch names with ellipsis
    label = branch.upper()
    if len(label) > MAX_LABEL_LEN:
        label = label[: MAX_LABEL_LEN - 1] + "\u2026"

    # Start large, shrink until it fits
    max_width = int(w * 0.88)
    font_size = 140
    font = load_font(font_size)

    while font_size > 36:
        bbox = draw.textbbox((0, 0), label, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            break
        font_size -= 4
        font = load_font(font_size)

    # Center text in the bar
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (w - text_w) // 2
    y = h - BAR_HEIGHT + (BAR_HEIGHT - text_h) // 2 - bbox[1]

    draw.text((x, y), label, fill=TEXT_COLOR, font=font)
    img.save(output_path, "PNG")


if __name__ == "__main__":
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print(f"Usage: {sys.argv[0]} <label> <base_icon> <output> [bar_color_hex]", file=sys.stderr)
        sys.exit(1)
    color = parse_hex_color(sys.argv[4]) if len(sys.argv) == 5 else BAR_COLOR
    generate(sys.argv[1], sys.argv[2], sys.argv[3], color)
