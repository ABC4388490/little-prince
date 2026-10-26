"""Trace the user's screenshot into a Unicode webfont, preserving existing pen strokes.

Usage: python scripts/build-screenshot-font.py /path/to/reference.png
Requires Pillow, numpy, vtracer==0.6.15 and fonttools[woff].
The manifest deliberately maps only manually checked characters, never invented glyphs.
"""
from pathlib import Path
import hashlib
import io
import json
import re
import sys
import numpy as np
from PIL import Image
import vtracer
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib import SVGPath

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/fonts'
manifest = json.loads((OUT / 'screenshot-glyphs-v1.json').read_text())
source_path = Path(sys.argv[1])
assert hashlib.sha256(source_path.read_bytes()).hexdigest() == manifest['source_sha256'], 'Reference screenshot differs from the manually checked source.'
source = Image.open(source_path).convert('RGB')
scale = manifest['scale_units_per_pixel']
# Capture the source at 4x for subpixel curve placement. Reject selection blue and UI gray.
glyphs = {'.notdef': TTGlyphPen(None).glyph()}
metrics = {'.notdef': (1000, 0)}
cmap = {}
for item in manifest['glyphs']:
    c = item['char']
    x1,y1,x2,y2 = item['box']
    crop = source.crop((x1,y1,x2,y2))
    pixels = np.asarray(crop).max(axis=2)
    # RGB maximum excludes blue selection blocks while preserving black antialiasing.
    gray = Image.fromarray(pixels).resize((crop.width*4,crop.height*4), Image.Resampling.BICUBIC)
    mask = np.asarray(gray) < manifest['threshold']
    coords = np.argwhere(mask)
    assert len(coords) > 2, f'Empty glyph {c}'
    top,left = coords.min(axis=0)
    bottom,right = coords.max(axis=0)+1
    # Keep a white border around each trace so outlines always close inside the canvas.
    ink = Image.fromarray(np.where(mask[top:bottom,left:right],0,255).astype('uint8'))
    canvas = Image.new('RGB',(ink.width+16,ink.height+16),'white')
    canvas.paste(ink,(8,8))
    data=io.BytesIO(); canvas.save(data,format='PNG')
    svg = vtracer.convert_raw_image_to_svg(data.getvalue(),img_format='png',colormode='binary',mode='spline',filter_speckle=0,corner_threshold=70,length_threshold=3.5,splice_threshold=45,path_precision=3)
    # Extremely tall source letters are capped to keep them within normal website lines.
    s=min(scale,1100/((bottom-top)/4))
    factor=s/4
    side=90
    source_top=y1+top/4
    baseline=item['baseline']
    shift_y=(baseline-source_top)*s+8*factor
    pen=TTGlyphPen(None)
    curves=Cu2QuPen(pen,max_err=0.6,reverse_direction=True)
    transform=TransformPen(curves,(factor,0,0,-factor,side-8*factor,shift_y))
    # FontTools' SVG reader accepts matrix(), while VTracer emits translate().
    svg = re.sub(r'translate\(([-\d.]+)[ ,]+([-\d.]+)\)',r'matrix(1 0 0 1 \1 \2)',svg)
    SVGPath.fromstring(svg.encode('utf-8')).draw(transform)
    name=f'uni{ord(c):04X}'
    glyphs[name]=pen.glyph()
    advance=round((right-left)/4*s+2*side)
    metrics[name]=(advance,side)
    cmap[ord(c)]=name

builder=FontBuilder(1000,isTTF=True)
builder.setupGlyphOrder(list(glyphs))
builder.setupCharacterMap(cmap)
builder.setupGlyf(glyphs)
builder.setupHorizontalMetrics(metrics)
builder.setupHorizontalHeader(ascent=1050,descent=-300,lineGap=0)
builder.setupNameTable({'familyName':manifest['family'],'styleName':'Regular','uniqueFontIdentifier':'LittlePrince-ScreenshotHand-20261026-v1','fullName':'Screenshot Hand Regular','psName':'ScreenshotHand-Regular','version':'Version 1.000','description':'Limited Unicode glyphs traced from a user-provided handwriting screenshot. No claims of complete font coverage.'})
builder.setupOS2(sTypoAscender=1050,sTypoDescender=-300,sTypoLineGap=0,usWinAscent=1200,usWinDescent=400,fsType=0)
builder.setupPost()
builder.setupMaxp()
builder.font.recalcTimestamp=False
builder.font['head'].created=builder.font['head'].modified=3875860800
builder.save(OUT/'screenshot-hand-v1.ttf')
builder.font.flavor='woff2'
builder.font.save(OUT/'screenshot-hand-v1.woff2')
print(json.dumps({'glyphs':len(cmap),'woff2_bytes':(OUT/'screenshot-hand-v1.woff2').stat().st_size,'characters':''.join(chr(c) for c in sorted(cmap))},ensure_ascii=False))
