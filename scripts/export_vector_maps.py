"""Export the guide's native raster artwork and vector labels as floor SVGs.

Usage: python scripts/export_vector_maps.py /path/to/2026-guide.pdf --validate

Requires PyMuPDF. Optional render validation also uses Inkscape, Pillow and
NumPy. Only assets/maps/<floor>.svg and data/map-quality.json are written;
park.json and the existing WebPs remain inputs. Render intermediates use /tmp.
"""

from __future__ import annotations

import argparse
import base64
from collections import Counter, defaultdict, deque
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

import fitz


ROOT = Path(__file__).resolve().parents[1]
SVG = "http://www.w3.org/2000/svg"
XLINK = "http://www.w3.org/1999/xlink"
FLOOR_IDS = ("B1", "1F", "2F", "3F", "4F", "MAGIC")
PREFERRED_MAX_BYTES = 10 * 1024 * 1024
NUMBER = re.compile(r"[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?")
URL_REF = re.compile(r"url\(\s*['\"]?#([^)'\"\s]+)['\"]?\s*\)")
# PDF coordinates and the background sampling pixels from extract_guide.py's
# original 2x page render. These remove only the clipped page-title fragments.
TITLE_WIPES = {
    "1F": ((300, 45, 500, 175), (800, 60)),
    "2F": ((160, 120, 600, 180), (1100, 100)),
}
ET.register_namespace("", SVG)
ET.register_namespace("xlink", XLINK)


def tag(name):
    return f"{{{SVG}}}{name}"


def fmt(value):
    return f"{value:g}"


def references(element):
    for node in element.iter():
        for key, value in node.attrib.items():
            if key in ("href", f"{{{XLINK}}}href") and value.startswith("#"):
                yield value[1:]
            yield from URL_REF.findall(value)


def prune_unused_definitions(root):
    """Keep all painted artwork; discard only unreachable SVG resources.

    MuPDF can emit the whole font's glyph paths for a handful of map numbers.
    Resolve resource references transitively, including masks and their images.
    """
    by_id = {node.attrib["id"]: node for node in root.iter() if "id" in node.attrib}
    definitions = root.find(tag("defs"))
    if definitions is None:
        return 0
    pending = deque(ref for node in root if node is not definitions
                    for ref in references(node))
    needed = set()
    while pending:
        ref = pending.popleft()
        if ref in needed:
            continue
        if ref not in by_id:
            raise ValueError(f"Unresolved SVG resource: {ref}")
        needed.add(ref)
        pending.extend(references(by_id[ref]))
    removed = 0
    for definition in list(definitions):
        ids = {node.get("id") for node in definition.iter() if node.get("id")}
        if ids and not ids.intersection(needed):
            definitions.remove(definition)
            removed += 1
    return removed


def native_svg(page, crop):
    """Use the same SVG device as get_svg_image(text_as_path=True), with culling.

    CropBox establishes the exact translated coordinate system. Replaying the
    native display list with a scissor also omits off-crop images before their
    bytes reach the SVG device. CropBox plus get_svg_image alone includes large
    hidden cover photographs and unrelated artwork from the rest of the page.
    No map artwork is rasterized or upsampled here.
    """
    original_crop = page.cropbox
    try:
        page.set_cropbox(crop)
        bounds = page.rect
        display_list = page.get_displaylist(annots=False)
        mupdf = fitz.mupdf
        buffer = mupdf.fz_new_buffer(1024)
        output = mupdf.FzOutput(buffer)
        device = mupdf.fz_new_svg_device(
            output, bounds.width, bounds.height, mupdf.FZ_SVG_TEXT_AS_PATH, 1
        )
        mupdf.fz_run_display_list(
            display_list.this, device, mupdf.FzMatrix(1, 0, 0, 1, 0, 0),
            mupdf.FzRect(0, 0, bounds.width, bounds.height), mupdf.FzCookie()
        )
        mupdf.fz_close_device(device)
        output.fz_close_output()
        return ET.fromstring(fitz.JM_EscapeStrFromBuffer(buffer))
    finally:
        page.set_cropbox(original_crop)


def wipe_color(page, floor):
    if floor["id"] not in TITLE_WIPES:
        return None
    _, (px, py) = TITLE_WIPES[floor["id"]]
    sample = page.get_pixmap(
        matrix=fitz.Matrix(2, 2),
        clip=fitz.Rect(px / 2, py / 2, (px + 1) / 2, (py + 1) / 2),
        colorspace=fitz.csRGB, alpha=False, annots=False
    )
    return "#" + "".join(f"{c:02x}" for c in sample.pixel(0, 0))


def mask_floor(root, floor, color):
    crop = fitz.Rect(floor["crop"])
    width, height = crop.width, crop.height
    root.set("width", fmt(width))
    root.set("height", fmt(height))
    root.set("viewBox", f"0 0 {fmt(width)} {fmt(height)}")
    root.set("overflow", "hidden")
    root.set("role", "img")
    root.set("aria-labelledby", "floor-title")
    definitions = root.find(tag("defs"))
    if definitions is None:
        definitions = ET.SubElement(root, tag("defs"))
    clip = ET.SubElement(definitions, tag("clipPath"), {
        "id": "floor-boundary", "clipPathUnits": "userSpaceOnUse"
    })
    if "polygon" in floor:
        ET.SubElement(clip, tag("polygon"), {
            "points": " ".join(f"{fmt(x - crop.x0)},{fmt(y - crop.y0)}"
                               for x, y in floor["polygon"])
        })
    else:
        ET.SubElement(clip, tag("rect"), {
            "width": fmt(width), "height": fmt(height)
        })
    content = ET.Element(tag("g"), {
        "id": "floor-content", "clip-path": "url(#floor-boundary)"
    })
    for child in list(root):
        if child is not definitions:
            root.remove(child)
            content.append(child)
    title = ET.Element(tag("title"), {"id": "floor-title"})
    title.text = floor["name"]
    root.insert(0, title)
    # PDF pages are opaque white. The existing upper-floor WebPs use f.bg in
    # the area outside the polygon, so retain that exact convention.
    ET.SubElement(root, tag("rect"), {
        "width": fmt(width), "height": fmt(height),
        "fill": floor["bg"] if "polygon" in floor else "#ffffff"
    })
    root.append(content)
    if color is not None:
        rect, _ = TITLE_WIPES[floor["id"]]
        x0, y0, x1, y1 = rect
        ET.SubElement(content, tag("rect"), {
            "id": "page-title-wipe", "x": fmt(x0 - crop.x0),
            "y": fmt(y0 - crop.y0), "width": fmt(x1 - x0),
            "height": fmt(y1 - y0), "fill": color
        })


def point_visible(x, y, floor):
    x0, y0, x1, y1 = floor["crop"]
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        return False
    wipe = TITLE_WIPES.get(floor["id"])
    if wipe:
        a, b, c, d = wipe[0]
        if a <= x <= c and b <= y <= d:
            return False
    polygon = floor.get("polygon")
    if not polygon:
        return True
    inside = False
    for (ax, ay), (bx, by) in zip(polygon, polygon[1:] + polygon[:1]):
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            inside = not inside
    return inside


def source_characters(page):
    return [char for block in page.get_text("rawdict", flags=fitz.TEXTFLAGS_TEXT)["blocks"]
            for line in block.get("lines", []) for span in line["spans"]
            for char in span.get("chars", [])]


def check_structure(root, floor, characters, background_bytes):
    ids = [node.get("id") for node in root.iter() if node.get("id")]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{floor['id']}: duplicate SVG IDs")
    missing = set(references(root)) - set(ids)
    if missing:
        raise ValueError(f"{floor['id']}: missing SVG resources: {sorted(missing)}")
    if list(root.iter(tag("text"))) or list(root.iter(tag("tspan"))):
        raise ValueError("All PDF text must be exported as font-independent paths")
    if list(root.iter(tag("script"))) or list(root.iter(tag("foreignObject"))):
        raise ValueError("The SVG must contain only static, self-contained artwork")
    dimensions = Counter()
    background_preserved = False
    for image in root.iter(tag("image")):
        href = image.get(f"{{{XLINK}}}href", image.get("href", ""))
        if not href.startswith("data:image/") or ";base64," not in href:
            raise ValueError("Raster artwork must be embedded in the SVG")
        data = base64.b64decode(href.split(",", 1)[1], validate=False)
        dimensions[(int(image.get("width")), int(image.get("height")))] += 1
        background_preserved |= data == background_bytes
    if not background_preserved:
        raise ValueError(f"{floor['id']}: original background JPEG bytes were lost")

    # Text is outlined, but MuPDF retains data-text on each glyph instance.
    # Check every exported baseline against the PDF to 0.02 PDF points, and
    # require every source glyph whose origin is inside the visible floor.
    exported = defaultdict(list)
    cx, cy = floor["crop"][:2]
    for node in root.iter(tag("use")):
        char = node.get("data-text")
        if char is None:
            continue
        matrix = [float(n) for n in NUMBER.findall(node.get("transform", ""))]
        if len(matrix) != 6:
            raise ValueError("Unexpected glyph transformation")
        exported[char].append((matrix[4] + cx, matrix[5] + cy))
    def near(a, b):
        return abs(a[0] - b[0]) < 0.02 and abs(a[1] - b[1]) < 0.02
    for char, positions in exported.items():
        originals = [c["origin"] for c in characters if c["c"] == char]
        if any(not any(near(p, original) for original in originals) for p in positions):
            raise ValueError(f"{floor['id']}: glyph position differs from the PDF")
    visible = [c for c in characters if point_visible(*c["origin"], floor)
               and not c["c"].isspace()]
    for char in visible:
        if not any(near(char["origin"], p) for p in exported[char["c"]]):
            raise ValueError(f"{floor['id']}: missing visible PDF glyph {char['c']!r}")
    return {
        "selfContained": True, "textElements": 0,
        "vectorPaths": sum(1 for _ in root.iter(tag("path"))),
        "outlinedGlyphInstances": sum(len(v) for v in exported.values()),
        "glyphOriginsVerified": sum(len(v) for v in exported.values()),
        "sourceVisibleGlyphsPreserved": len(visible),
        "glyphOriginTolerancePoints": 0.02,
        "rasterImageElements": sum(dimensions.values()),
        "embeddedRasterPixels": [
            {"width": w, "height": h, "count": n}
            for (w, h), n in sorted(dimensions.items(), key=lambda item: -math.prod(item[0]))
        ],
        "nativeBackgroundJPEGBytesPreserved": True,
    }


def validate_render(doc, floor, svg_path, color, pois):
    """Render locally with Inkscape, whose SVG mask support preserves PDF alpha.

    MuPDF 1.26's SVG *reader* drops luminance masks; it is unsuitable for
    validating the otherwise standard SVG emitted by its PDF exporter.
    """
    import numpy as np
    from PIL import Image, ImageDraw

    inkscape = shutil.which("inkscape")
    if not inkscape:
        raise RuntimeError("--validate requires the Inkscape command-line renderer")
    scale = 2
    crop = fitz.Rect(floor["crop"])
    pixmap = doc[floor["page"]].get_pixmap(
        matrix=fitz.Matrix(scale, scale), clip=crop,
        colorspace=fitz.csRGB, alpha=False, annots=False
    )
    reference = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    if color:
        a, b, c, d = TITLE_WIPES[floor["id"]][0]
        ImageDraw.Draw(reference).rectangle(
            [(a - crop.x0) * scale, (b - crop.y0) * scale,
             (c - crop.x0) * scale, (d - crop.y0) * scale], fill=color
        )
    if "polygon" in floor:
        mask = Image.new("L", reference.size)
        ImageDraw.Draw(mask).polygon(
            [((x - crop.x0) * scale, (y - crop.y0) * scale)
             for x, y in floor["polygon"]], fill=255
        )
        back = Image.new("RGB", reference.size, floor["bg"])
        back.paste(reference, mask=mask)
        reference = back
    with tempfile.TemporaryDirectory(prefix=f"lotte-vector-{floor['id']}-") as tmp:
        png = Path(tmp) / "render.png"
        subprocess.run([
            inkscape, str(svg_path), "--export-area-page", "--export-type=png",
            f"--export-width={pixmap.width}", f"--export-filename={png}",
            "--export-background=#ffffff", "--export-background-opacity=1"
        ], check=True, capture_output=True, text=True)
        with Image.open(png) as rendered:
            actual = rendered.convert("RGB")
    if actual.size != reference.size:
        raise ValueError(f"{floor['id']}: render dimensions differ from the original")
    a = np.asarray(actual).astype(np.int16)
    r = np.asarray(reference).astype(np.int16)
    difference = np.abs(a - r)
    metrics = {
        "renderer": "Inkscape", "scale": scale,
        "sameDimensionsAsPDFCrop": True,
        "pdfMeanAbsoluteChannelDifference": round(float(difference.mean()), 4),
        "pdfPixelsOver20ChannelDifferencePercent": round(
            float((difference.max(axis=2) > 20).mean() * 100), 4
        ),
    }
    webp_path = ROOT / f"assets/maps/{floor['id']}.webp"
    if webp_path.exists():
        with Image.open(webp_path) as webp:
            if webp.size != actual.size:
                raise ValueError(f"{floor['id']}: render dimensions differ from the WebP")
            webp_array = np.asarray(webp.convert("RGB")).astype(np.int16)
        metrics["webpMeanAbsoluteChannelDifference"] = round(
            float(np.abs(a - webp_array).mean()), 4
        )
    regions = []
    for poi in pois:
        if poi["floor"] != floor["id"] or not poi.get("pdf"):
            continue
        x, y = poi["pdf"]
        if not point_visible(x, y, floor):
            continue
        x = round((x - crop.x0) * scale)
        y = round((y - crop.y0) * scale)
        box = difference[max(0, y - 24):y + 24, max(0, x - 24):x + 24]
        regions.append(float(box.mean()))
    metrics["poiRegionsCompared"] = len(regions)
    metrics["poiRegionMedianAbsoluteChannelDifference"] = round(
        float(np.median(regions)), 4
    ) if regions else None
    return metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--validate", action="store_true",
                        help="Compare local Inkscape renders with PDF crops and existing WebPs")
    args = parser.parse_args()
    park = json.loads((ROOT / "data/park.json").read_text())
    floors = park["floors"]
    if tuple(f["id"] for f in floors) != FLOOR_IDS:
        raise ValueError("Expected the six guide floors in data/park.json")
    report = {
        "source": args.pdf.name, "exporter": f"PyMuPDF {fitz.VersionBind}",
        "coordinateUnits": "PDF points; SVG viewBox units match f.crop exactly",
        "qualityLimits": [
            "PDF vectors and outlined text scale independently of pixels.",
            "Raster artwork retains the original PDF pixels and JPEG bytes; no upsampling or sharpening.",
            "Small facility icons and any labels already rasterized in the PDF retain their native resolution.",
            "MuPDF 1.26 SVG reading omits luminance masks; use a full SVG renderer such as Inkscape or a browser.",
        ],
        "floors": {},
    }
    with fitz.open(args.pdf) as doc:
        image_infos = {}
        text_chars = {}
        for floor in floors:
            fid = floor["id"]
            page = doc[floor["page"]]
            crop = fitz.Rect(floor["crop"])
            if page.rotation or not page.rect.contains(crop):
                raise ValueError(f"{fid}: expected an unrotated page containing the exact crop")
            if floor["width"] != crop.width or floor["height"] != crop.height:
                raise ValueError(f"{fid}: park.json dimensions disagree with its crop")
            if page.number not in image_infos:
                image_infos[page.number] = page.get_image_info(xrefs=True)
                text_chars[page.number] = source_characters(page)
            # The original floor image has the largest overlap with this floor's
            # crop, rather than the largest source dimensions on a shared page.
            candidates = [im for im in image_infos[page.number]
                          if im["xref"] and min(im["width"], im["height"]) > 300]
            background = max(candidates, key=lambda im: (fitz.Rect(im["bbox"]) & crop).get_area())
            background_bytes = doc.extract_image(background["xref"])["image"]
            color = wipe_color(page, floor)
            root = native_svg(page, crop)
            mask_floor(root, floor, color)
            removed = prune_unused_definitions(root)
            checks = check_structure(root, floor, text_chars[page.number], background_bytes)
            image_path = f"assets/maps/{fid}.svg"
            target = ROOT / image_path
            data = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            target.write_bytes(data)
            bbox = fitz.Rect(background["bbox"])
            quality = {
                "image": image_path, "width": floor["width"], "height": floor["height"],
                "bytes": len(data), "withinPreferred10MiB": len(data) < PREFERRED_MAX_BYTES,
                "crop": floor["crop"], "polygon": floor.get("polygon"),
                "nativeBackgroundPixels": [background["width"], background["height"]],
                "nativeBackgroundPDFBounds": [round(v, 5) for v in bbox],
                "nativeBackgroundPixelsPerPoint": [
                    round(background["width"] / bbox.width, 5),
                    round(background["height"] / bbox.height, 5)
                ],
                "titleWipe": {"rect": TITLE_WIPES[fid][0], "fill": color} if color else None,
                "prunedUnusedDefinitions": removed, **checks,
            }
            if args.validate:
                quality["renderValidation"] = validate_render(doc, floor, target, color, park["pois"])
            report["floors"][fid] = quality
            print(f"{image_path}: {len(data):,} bytes; "
                  f"{checks['vectorPaths']} paths; "
                  f"{checks['glyphOriginsVerified']} glyph origins verified; "
                  f"native background {background['width']}x{background['height']}", flush=True)
    (ROOT / "data/map-quality.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
