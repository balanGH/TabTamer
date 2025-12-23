#!/usr/bin/env python3
"""
Generate simple PNG icons for the Chrome extension
Creates 16x16, 48x48, and 128x128 PNG files with a clock icon
"""

import struct
import zlib

def create_png(width, height, pixels):
    """Create a PNG file from raw pixel data"""

    def png_chunk(chunk_type, data):
        chunk_data = chunk_type + data
        crc = zlib.crc32(chunk_data) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk_data + struct.pack('>I', crc)

    # PNG signature
    png_data = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk (image header)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png_data += png_chunk(b'IHDR', ihdr)

    # IDAT chunk (image data)
    raw_data = b''
    for row in pixels:
        raw_data += b'\x00'  # Filter type
        raw_data += row

    compressed = zlib.compress(raw_data, 9)
    png_data += png_chunk(b'IDAT', compressed)

    # IEND chunk
    png_data += png_chunk(b'IEND', b'')

    return png_data

def draw_clock_icon(size):
    """Draw a simple clock icon on gradient background"""
    pixels = []

    center_x, center_y = size // 2, size // 2
    radius = size // 3

    for y in range(size):
        row = b''
        for x in range(size):
            # Gradient background (purple)
            r = int(102 + (118 - 102) * (x / size))
            g = int(126 + (75 - 126) * (x / size))
            b = int(234 + (162 - 234) * (x / size))
            a = 255

            # Draw circle
            dx = x - center_x
            dy = y - center_y
            dist = (dx * dx + dy * dy) ** 0.5

            if abs(dist - radius) < size / 16:
                r, g, b = 255, 255, 255

            # Draw clock hands
            # Hour hand (vertical)
            if abs(x - center_x) < size / 16 and y < center_y and dist < radius * 0.6:
                r, g, b = 255, 255, 255

            # Minute hand (horizontal)
            if abs(y - center_y) < size / 16 and x > center_x and dist < radius * 0.7:
                r, g, b = 255, 255, 255

            # Center dot
            if dist < size / 10:
                r, g, b = 255, 255, 255

            row += struct.pack('BBBB', r, g, b, a)

        pixels.append(row)

    return pixels

# Generate icons
sizes = [16, 48, 128]

for size in sizes:
    print(f"Generating icon{size}.png...")
    pixels = draw_clock_icon(size)
    png_data = create_png(size, size, pixels)

    with open(f'icon{size}.png', 'wb') as f:
        f.write(png_data)

    print(f"✓ Created icon{size}.png ({len(png_data)} bytes)")

print("\nAll icons generated successfully!")
