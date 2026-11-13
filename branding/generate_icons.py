"""Provisional Take icon: a coral rounded square with a clapperboard (the "slate" film crews
snap at the start of a take). Run `python3 branding/generate_icons.py` to regenerate every icon
size used by the app and the installers. Replace the drawing with the real logo later.
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SIZE = 1024  # master canvas, drawn at 2x then downscaled (smooth edges)
SS = 2

CORAL_TOP = (255, 122, 89)
CORAL_BOTTOM = (240, 78, 72)
INK = (31, 38, 61)
WHITE = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_mask(size, radius, margin=0):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (margin, margin, size - margin - 1, size - margin - 1), radius=radius, fill=255
    )
    return mask


def clap_stick(bar_w, bar_h, radius):
    bar = Image.new("RGBA", (int(bar_w), int(bar_h)), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bar)
    bd.rounded_rectangle((0, 0, bar_w - 1, bar_h - 1), radius=radius, fill=WHITE)
    stripe_w = bar_w / 7
    for i in range(0, 7, 2):
        x0 = i * stripe_w
        bd.polygon(
            [
                (x0 + stripe_w * 0.6, 0),
                (x0 + stripe_w * 1.6, 0),
                (x0 + stripe_w * 1.0, bar_h),
                (x0 + stripe_w * 0.0, bar_h),
            ],
            fill=INK,
        )
    mask = Image.new("L", bar.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, bar_w - 1, bar_h - 1), radius=radius, fill=255)
    bar.putalpha(Image.composite(bar.getchannel("A"), Image.new("L", bar.size, 0), mask))
    return bar


def draw_master(margin_ratio):
    s = SIZE * SS
    margin = int(s * margin_ratio)
    inner = s - 2 * margin
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    gradient = Image.new("RGBA", (s, s))
    gpx = ImageDraw.Draw(gradient)
    for y in range(s):
        gpx.line((0, y, s, y), fill=lerp(CORAL_TOP, CORAL_BOTTOM, y / s) + (255,))
    img.paste(gradient, (0, 0), rounded_mask(s, int(inner * 0.225), margin))

    d = ImageDraw.Draw(img)
    cx = s / 2

    def u(v):
        return v * inner

    left, right = cx - u(0.30), cx + u(0.30)
    body_top, body_bottom = margin + u(0.43), margin + u(0.77)

    d.rounded_rectangle((left, body_top, right, body_bottom), radius=u(0.04), fill=WHITE)
    dot_r = u(0.075)
    dcx, dcy = left + u(0.16), (body_top + body_bottom) / 2 + u(0.01)
    d.ellipse((dcx - dot_r, dcy - dot_r, dcx + dot_r, dcy + dot_r), fill=CORAL_BOTTOM)
    for i, w in enumerate((0.20, 0.13)):
        y = (body_top + body_bottom) / 2 - u(0.035) + i * u(0.07)
        d.rounded_rectangle(
            (left + u(0.29), y, left + u(0.29) + u(w), y + u(0.03)), radius=u(0.015), fill=INK
        )

    # Clap stick hinged at the body's upper-left corner, opened a few degrees.
    bar = clap_stick(u(0.60), u(0.115), u(0.03))
    angle = 11
    rad = math.radians(angle)
    px, py = 0, bar.height  # hinge = lower-left corner
    corners = [(0, 0), (bar.width, 0), (bar.width, bar.height), (0, bar.height)]
    rot = [
        (
            px + (x - px) * math.cos(rad) + (y - py) * math.sin(rad),
            py - (x - px) * math.sin(rad) + (y - py) * math.cos(rad),
        )
        for x, y in corners
    ]
    min_x, min_y = min(c[0] for c in rot), min(c[1] for c in rot)
    rotated = bar.rotate(angle, resample=Image.BICUBIC, expand=True, center=(px, py))
    hinge = (left, body_top - u(0.012))
    img.alpha_composite(
        rotated, (int(hinge[0] - (px - min_x)), int(hinge[1] - (py - min_y)))
    )
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def save_sizes(master, sizes, pattern):
    for size in sizes:
        out = os.path.join(ROOT, pattern.format(size=size))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        master.resize((size, size), Image.LANCZOS).save(out)


def main():
    flat = draw_master(0.0)  # Windows / Linux: the tile fills the canvas
    mac = draw_master(0.085)  # macOS: system-style margin around the tile

    app_sizes = [16, 32, 64, 128, 256, 512, 1024]
    save_sizes(flat, app_sizes, "public/app-icons/take-{size}.png")
    save_sizes(mac, app_sizes, "public/app-icons/takemac-{size}.png")
    save_sizes(flat, [16, 24, 32, 48, 64, 128, 256, 512, 1024], "icons/icons/png/{size}x{size}.png")

    ico_dir = os.path.join(ROOT, "icons/icons/win")
    os.makedirs(ico_dir, exist_ok=True)
    flat.save(
        os.path.join(ico_dir, "icon.ico"),
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    icns_dir = os.path.join(ROOT, "icons/icons/mac")
    os.makedirs(icns_dir, exist_ok=True)
    mac.save(os.path.join(icns_dir, "icon.icns"))


if __name__ == "__main__":
    main()
