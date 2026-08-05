import subprocess, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen

OUT = "/dev-server/public"
BRONZE = "#BB864B"
BROWN = "#3A2317"
WHITE = "#FFFFFF"

# ---------- 1. Symbol (flute) as clean vector ----------
# viewBox 100 x 682, bronze shapes with transparent cut-outs (mask)
def symbol_svg(color):
    holes = "".join(
        f'<rect x="34" y="{t}" width="58" height="33" rx="8" fill="#000"/>'
        for t in (162, 223, 285, 346, 408)
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 682" role="img" aria-label="vardbemanning.ai">
  <mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="682">
    <rect x="0" y="0" width="100" height="67" rx="14" fill="#fff"/>
    <rect x="0" y="101" width="100" height="429" rx="16" fill="#fff"/>
    <rect x="0" y="563" width="100" height="119" rx="14" fill="#fff"/>
    {holes}
    <rect x="-4" y="470" width="34" height="28" rx="8" fill="#000"/>
  </mask>
  <rect x="0" y="0" width="100" height="682" fill="{color}" mask="url(#m)"/>
</svg>
'''

open(f"{OUT}/vardbemanning-symbol.svg", "w").write(symbol_svg(BRONZE))

# ---------- 2. Wordmark from Manrope SemiBold outlines ----------
TEXT = "vardbemanning.ai"
vf = TTFont("/tmp/Manrope.ttf")
font = instancer.instantiateVariableFont(vf, {"wght": 600})
gs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm

paths, x = [], 0
for ch in TEXT:
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs)
    gs[name].draw(pen)
    d = pen.getCommands()
    if d:
        paths.append((d, x))
    x += gs[name].width

# bbox
from fontTools.pens.boundsPen import BoundsPen
ymin, ymax = 1e9, -1e9
for ch in TEXT:
    bp = BoundsPen(gs)
    gs[cmap[ord(ch)]].draw(bp)
    if bp.bounds:
        ymin = min(ymin, bp.bounds[1]); ymax = max(ymax, bp.bounds[3])
W, H = x, ymax - ymin

PAD = H * 0.06

def wordmark_svg(color):
    body = "".join(
        f'<path transform="translate({tx} 0)" d="{d}"/>' for d, tx in paths
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W + 2 * PAD:.0f} {H + 2 * PAD:.0f}" role="img" aria-label="{TEXT}">
  <g transform="translate({PAD:.0f} {ymax + PAD:.0f}) scale(1 -1)" fill="{color}">{body}</g>
</svg>
'''

open(f"{OUT}/vardbemanning-wordmark-light.svg", "w").write(wordmark_svg(BROWN))
open(f"{OUT}/vardbemanning-wordmark-dark.svg", "w").write(wordmark_svg(WHITE))

# ---------- 3. Lockups (symbol + wordmark) ----------
def lockup_svg(text_color):
    pad = H * 0.08
    sh = H * 1.45
    sw = sh * 100 / 682
    gap = H * 0.45
    total_w = pad * 2 + sw + gap + W
    total_h = sh + pad * 2
    sy = pad
    ty = pad + (sh - H) / 2
    holes = "".join(
        f'<rect x="34" y="{t}" width="58" height="33" rx="8" fill="#000"/>'
        for t in (162, 223, 285, 346, 408)
    )
    body = "".join(f'<path transform="translate({tx} 0)" d="{d}"/>' for d, tx in paths)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.0f} {total_h:.0f}" role="img" aria-label="{TEXT}">
  <mask id="ms" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="682">
    <rect x="0" y="0" width="100" height="67" rx="14" fill="#fff"/>
    <rect x="0" y="101" width="100" height="429" rx="16" fill="#fff"/>
    <rect x="0" y="563" width="100" height="119" rx="14" fill="#fff"/>
    {holes}
    <rect x="-4" y="470" width="34" height="28" rx="8" fill="#000"/>
  </mask>
  <g transform="translate({pad:.0f} {sy:.0f}) scale({sh / 682:.5f})"><rect x="0" y="0" width="100" height="682" fill="{BRONZE}" mask="url(#ms)"/></g>
  <g transform="translate({pad + sw + gap:.0f} {ty + ymax:.0f}) scale(1 -1)" fill="{text_color}">{body}</g>
</svg>
'''

open(f"{OUT}/vardbemanning-lockup-light.svg", "w").write(lockup_svg(BROWN))
open(f"{OUT}/vardbemanning-lockup-dark.svg", "w").write(lockup_svg(WHITE))

# ---------- 4. Crisp PNG raster fallbacks ----------
def png(src, dst, w):
    subprocess.run(["rsvg-convert", "-w", str(w), f"{OUT}/{src}", "-o", f"{OUT}/{dst}"], check=True)

png("vardbemanning-wordmark-light.svg", "vardbemanning-wordmark-light-v2.png", 1600)
png("vardbemanning-wordmark-dark.svg", "vardbemanning-wordmark-dark-v2.png", 1600)
png("vardbemanning-symbol.svg", "vardbemanning-icon-v2.png", 400)
png("vardbemanning-lockup-light.svg", "vardbemanning-logo-light-v2.png", 1800)
png("vardbemanning-lockup-dark.svg", "vardbemanning-logo-dark-v2.png", 1800)

# ---------- 5. Favicons: bold simplified flute on brand navy ----------
NAVY = "#0F1B2D"
fav_holes = "".join(
    f'<rect x="44" y="{t}" width="14" height="7" rx="3" fill="{NAVY}"/>'
    for t in (34, 48, 62)
)
fav = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="vardbemanning.ai">
  <rect width="100" height="100" rx="18" fill="{NAVY}"/>
  <rect x="38" y="8" width="24" height="14" rx="5" fill="{BRONZE}"/>
  <rect x="38" y="26" width="24" height="48" rx="6" fill="{BRONZE}"/>
  <rect x="38" y="78" width="24" height="14" rx="5" fill="{BRONZE}"/>
  {fav_holes}
</svg>
'''
open(f"{OUT}/favicon.svg", "w").write(fav)
open(f"{OUT}/vardbemanning-icon.svg", "w").write(fav)
for size in (16, 32, 48, 96, 192, 512):
    png("favicon.svg", f"favicon-{size}x{size}.png", size)
png("favicon.svg", "apple-touch-icon.png", 180)
png("favicon.svg", "maskable-icon-512x512.png", 512)
png("favicon.svg", "android-chrome-192x192.png", 192)
png("favicon.svg", "android-chrome-512x512.png", 512)
from PIL import Image
ico = [Image.open(f"{OUT}/favicon-{s}x{s}.png").convert("RGBA") for s in (16, 32, 48)]
ico[2].save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("wordmark", W, H, "done")
