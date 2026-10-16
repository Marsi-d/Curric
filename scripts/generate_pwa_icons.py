import os
import math
import struct
import zlib

def write_png(width, height, pixel_fn, filepath):
    raw = bytearray()
    for y in range(height):
        raw.append(0) # None filter
        for x in range(width):
            raw.extend(pixel_fn(x, y, width, height))

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    iend = chunk(b'IEND', b'')

    with open(filepath, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

def render_icon(x, y, w, h, is_maskable=False):
    # Normalize to 512x512 coordinate space
    nx = (x / w) * 512.0
    ny = (y / h) * 512.0

    # Background
    # For maskable, full bleed; for regular, rounded squircle
    bg_r = 15 + int((ny / 512.0) * 10)
    bg_g = 23 + int((ny / 512.0) * 80)
    bg_b = 42 + int((nx / 512.0) * 120)

    # Check squircle bounds if not maskable
    if not is_maskable:
        # Distance from edge with round corner radius ~ 100
        rx, ry = 100.0, 100.0
        inside = True
        dx = max(0, abs(nx - 256.0) - (256.0 - rx))
        dy = max(0, abs(ny - 256.0) - (256.0 - ry))
        if math.hypot(dx, dy) > rx:
            return (0, 0, 0, 0) # transparent outer edge

    # Inside safe zone / icon elements
    # Scale coordinates slightly for maskable to stay in safe 80% zone
    if is_maskable:
        # Center is (256, 256). Scale around center by 0.75
        cx, cy = 256.0, 256.0
        nx = cx + (nx - cx) / 0.8
        ny = cy + (ny - cy) / 0.8

    # Network connection lines
    # Vertical root line (256, 140) to (256, 270)
    if abs(nx - 256) <= 5 and 150 <= ny <= 270:
        return (56, 189, 248, 220)
    # Horizontal branch line (160, 270) to (352, 270)
    if abs(ny - 270) <= 4 and 160 <= nx <= 352:
        return (56, 189, 248, 220)
    # Left vertical branch (160, 270) to (160, 350)
    if abs(nx - 160) <= 4 and 270 <= ny <= 350:
        return (56, 189, 248, 220)
    # Middle vertical branch (256, 270) to (256, 350)
    if abs(nx - 256) <= 4 and 270 <= ny <= 350:
        return (56, 189, 248, 220)
    # Right vertical branch (352, 270) to (352, 350)
    if abs(nx - 352) <= 4 and 270 <= ny <= 350:
        return (56, 189, 248, 220)

    # Root Node circle (256, 140), radius 42
    d_root = math.hypot(nx - 256, ny - 140)
    if d_root <= 42:
        # Graduation / cap shape inside root
        cap_dist = math.hypot(nx - 256, (ny - 140) * 1.6)
        if cap_dist <= 18:
            return (15, 23, 42, 255)
        # Gradient from sky-400 to indigo-400
        t = (nx - (256 - 42)) / 84.0
        cr = int(56 * (1 - t) + 129 * t)
        cg = int(189 * (1 - t) + 140 * t)
        cb = int(248 * (1 - t) + 248 * t)
        return (cr, cg, cb, 255)

    # Node 1: Left Subject (160, 356), radius 30
    d_n1 = math.hypot(nx - 160, ny - 356)
    if d_n1 <= 30:
        if abs(nx - 160) <= 12 and abs(ny - 356) <= 8:
            return (15, 23, 42, 255)
        return (56, 189, 248, 255)

    # Node 2: Middle Milestone (256, 356), radius 32
    d_n2 = math.hypot(nx - 256, ny - 356)
    if d_n2 <= 32:
        # Checkmark center
        if (nx >= 246 and nx <= 266 and abs((ny - 356) - (nx - 256)*0.8) <= 3) or (nx >= 240 and nx <= 248 and abs((ny - 356) + (nx - 246)*1.2) <= 3):
            return (15, 23, 42, 255)
        return (52, 211, 153, 255)

    # Node 3: Right Rankings (352, 356), radius 30
    d_n3 = math.hypot(nx - 352, ny - 356)
    if d_n3 <= 30:
        # 3 ranking tier lines
        if (abs(nx - 352) <= 10 and (abs(ny - 350) <= 2 or abs(ny - 356) <= 2 or abs(ny - 362) <= 2)):
            return (15, 23, 42, 255)
        return (129, 140, 248, 255)

    return (bg_r, bg_g, bg_b, 255)

os.makedirs('public', exist_ok=True)
write_png(192, 192, lambda x, y, w, h: render_icon(x, y, w, h, False), 'public/pwa-192x192.png')
write_png(512, 512, lambda x, y, w, h: render_icon(x, y, w, h, False), 'public/pwa-512x512.png')
write_png(512, 512, lambda x, y, w, h: render_icon(x, y, w, h, True), 'public/pwa-maskable-512x512.png')
write_png(180, 180, lambda x, y, w, h: render_icon(x, y, w, h, False), 'public/apple-touch-icon.png')
# Also write favicon.ico
with open('public/pwa-192x192.png', 'rb') as src, open('public/favicon.ico', 'wb') as dst:
    dst.write(src.read())

print("Icons successfully generated.")
