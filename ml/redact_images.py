import os
from pathlib import Path
from typing import Iterable
from PIL import Image, ImageFilter, ImageDraw, ImageFont

"""
Simple redaction utility:
- Blurs the entire image and overlays a large 'REDACTED' banner.
- Produces non-PII demo assets that are safe to keep in the repo.

Usage (from project root):
  python CAPSTONE UI2/CAPSTONE UI2/ml/redact_images.py "path/to/input_dir" "path/to/output_dir"
"""

def iter_images(folder: Path) -> Iterable[Path]:
    for ext in ("*.jpg", "*.jpeg", "*.png"):
        yield from folder.rglob(ext)

def redact_image(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGB")
    blurred = img.filter(ImageFilter.GaussianBlur(radius=12))

    # Draw 'REDACTED' banner
    draw = ImageDraw.Draw(blurred)
    w, h = blurred.size
    banner_h = int(h * 0.18)
    y0 = (h - banner_h) // 2
    draw.rectangle([(0, y0), (w, y0 + banner_h)], fill=(0, 0, 0, 180))

    text = "REDACTED"
    try:
        font = ImageFont.truetype("arial.ttf", size=int(banner_h * 0.6))
    except Exception:
        font = ImageFont.load_default()

    tw, th = draw.textsize(text, font=font)
    draw.text(((w - tw) / 2, y0 + (banner_h - th) / 2), text, fill=(255, 255, 255), font=font)

    dst.parent.mkdir(parents=True, exist_ok=True)
    blurred.save(dst, format="JPEG", quality=90)

def main():
    import sys
    if len(sys.argv) < 3:
        print("Usage: python redact_images.py <input_dir> <output_dir>")
        sys.exit(1)

    in_dir = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])

    if not in_dir.exists():
        print(f"Input directory does not exist: {in_dir}")
        sys.exit(1)

    count = 0
    for src in iter_images(in_dir):
        rel = src.relative_to(in_dir)
        dst = out_dir / rel.with_suffix(".jpg")
        redact_image(src, dst)
        count += 1

    print(f"Redacted {count} image(s) → {out_dir}")

if __name__ == "__main__":
    main()

