#!/usr/bin/env python3
"""Cache only maps and attraction thumbnails listed in data/official.json.

Requires Pillow. Run: python scripts/cache_assets.py
Optional review workflow (no project writes in the first step):
  python scripts/cache_assets.py --source-cache /tmp/lotte-assets --inspect-only
  python scripts/cache_assets.py --source-cache /tmp/lotte-assets --offline

Maps retain their complete native pixels and alpha in lossless WebP. The official
570x427 dimensions describe the display/coordinate plane, not a crop instruction.
Attraction photos use a centered 320x220 cover crop at WebP quality 80. Reviewed
artwork with essential text can be listed in CONTAIN_ATTRACTIONS to retain it all.
Each uncached URL gets one urllib request, with at most three concurrent jobs.
The JSON report on stdout includes native dimensions, anomalies, and failures.
"""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
import sys
import urllib.request

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DISPLAY_SIZE = (570, 427)
THUMBNAIL_SIZE = (320, 220)
MAX_BYTES = 32 * 1024 * 1024
WORKERS = 3
TIMEOUT = 25
CONTAIN_ATTRACTIONS: dict[str, str] = {}


def source_bytes(url: str, cache: Path | None, offline: bool) -> bytes:
    cached = cache / (hashlib.sha256(url.encode()).hexdigest() + ".source") if cache else None
    if cached and cached.is_file():
        payload = cached.read_bytes()
    else:
        if offline:
            raise ValueError("Source is absent from the offline cache")
        request = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (compatible; LotteWorldAssetCache/1.0)",
            "Accept": "image/*",
            "Referer": "https://adventure.lotteworld.com/",
        })
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            if response.status != 200:
                raise ValueError(f"Unexpected HTTP status {response.status}")
            payload = response.read(MAX_BYTES + 1)
        if len(payload) > MAX_BYTES:
            raise ValueError(f"Source exceeds {MAX_BYTES} bytes")
        # Cache only successfully decoded, complete images, never an error page.
        with Image.open(BytesIO(payload)) as image:
            image.load()
        if cached:
            cached.write_bytes(payload)
    if len(payload) > MAX_BYTES:
        raise ValueError(f"Source exceeds {MAX_BYTES} bytes")
    return payload


def process(job: dict, args: argparse.Namespace) -> dict:
    kind, asset_id, record = job["kind"], job["id"], job["record"]
    url = record.get("imageUrl") or record.get("image")
    result = {"kind": kind, "id": asset_id, "url": url}
    try:
        if not isinstance(url, str) or not url.startswith("https://adventure.lotteworld.com/"):
            raise ValueError("Missing official HTTPS image URL")
        payload = source_bytes(url, args.source_cache, args.offline)
        with Image.open(BytesIO(payload)) as source:
            source.load()
            if getattr(source, "n_frames", 1) != 1:
                raise ValueError("Animated source requires manual review")
            result.update(nativeSize=list(source.size), sourceFormat=source.format,
                          sourceBytes=len(payload))
            if kind == "maps":
                declared = (record.get("width"), record.get("height"))
                if declared != DISPLAY_SIZE:
                    raise ValueError(f"Declared map display size {declared} is not {DISPLAY_SIZE}")
                result["declaredDisplaySize"] = list(declared)
                if source.size != declared:
                    result["dimensionAnomaly"] = {
                        "nativeSize": list(source.size),
                        "declaredDisplaySize": list(declared),
                        "aspectRatioDifferencePercent": round(
                            (source.width * declared[1] / (source.height * declared[0]) - 1) * 100, 4),
                        "action": "Preserved full native size, aspect ratio, content, and alpha",
                    }
                output = source.convert("RGBA" if "A" in source.getbands() or "transparency" in source.info else "RGB")
                result["resizeMode"] = "native-lossless"
                folder = "official-maps"
            else:
                photo = ImageOps.exif_transpose(source).convert("RGB")
                if asset_id in CONTAIN_ATTRACTIONS:
                    output = ImageOps.pad(photo, THUMBNAIL_SIZE, method=Image.Resampling.LANCZOS,
                                          color="white", centering=(0.5, 0.5))
                    result["resizeMode"] = "contain"
                    result["reviewNote"] = CONTAIN_ATTRACTIONS[asset_id]
                else:
                    output = ImageOps.fit(photo, THUMBNAIL_SIZE, method=Image.Resampling.LANCZOS,
                                          centering=(0.5, 0.5))
                    result["resizeMode"] = "cover"
                result["orientedSize"] = list(photo.size)
                if photo.width < THUMBNAIL_SIZE[0] or photo.height < THUMBNAIL_SIZE[1]:
                    result["dimensionAnomaly"] = "Source is smaller than the requested thumbnail"
                folder = "attractions"
            relative = f"assets/{folder}/{asset_id}.webp"
            result.update(path=relative, outputSize=list(output.size))
            if not args.inspect_only:
                destination = ROOT / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                temporary = destination.with_suffix(".webp.tmp")
                try:
                    output.save(temporary, "WEBP", lossless=(kind == "maps"), quality=80, method=6,
                                **({"exact": True} if kind == "maps" else {}))
                    with Image.open(temporary) as check:
                        check.load()
                        if check.format != "WEBP" or check.size != output.size:
                            raise ValueError("Encoded image dimensions or format failed verification")
                        if kind == "maps" and check.convert(output.mode).tobytes() != output.tobytes():
                            raise ValueError("Lossless map pixel verification failed")
                    result["outputBytes"] = temporary.stat().st_size
                    temporary.replace(destination)
                finally:
                    temporary.unlink(missing_ok=True)
    except Exception as exc:
        result.pop("path", None)
        result["error"] = f"{type(exc).__name__}: {exc}"
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-cache", type=Path, help="Optional temporary cache of original downloads")
    parser.add_argument("--inspect-only", action="store_true", help="Download for review without writing project assets")
    parser.add_argument("--offline", action="store_true", help="Use only previously downloaded sources")
    args = parser.parse_args()
    if (args.inspect_only or args.offline) and not args.source_cache:
        parser.error("--inspect-only and --offline require --source-cache")
    if args.source_cache:
        args.source_cache.mkdir(parents=True, exist_ok=True)
    official = json.loads((ROOT / "data/official.json").read_text(encoding="utf-8"))
    dimensions = official["mapDimensions"]
    if (dimensions.get("width"), dimensions.get("height")) != DISPLAY_SIZE:
        raise ValueError("Official display dimensions have changed; review before proceeding")
    jobs = []
    for kind in ("maps", "attractions"):
        seen = set()
        for record in official[kind]:
            asset_id = str(record["id"] if kind == "maps" else record["officialId"])
            if not re.fullmatch(r"[A-Za-z0-9_-]+", asset_id) or asset_id in seen:
                raise ValueError(f"Unsafe or duplicate {kind} ID: {asset_id}")
            seen.add(asset_id)
            jobs.append({"kind": kind, "id": asset_id, "record": record})
    results = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(process, job, args): job for job in jobs}
        for future in as_completed(futures):
            result = future.result()
            results[(result["kind"], result["id"])] = result
            size = result.get("nativeSize", ["?", "?"])
            print(f"{result['kind']}/{result['id']}: "
                  + (result["error"] if "error" in result else f"{size[0]}x{size[1]}"), file=sys.stderr, flush=True)
    ordered = [results[(job["kind"], job["id"])] for job in jobs]
    mapping = {kind: {row["id"]: row["path"] for row in ordered if row["kind"] == kind and "path" in row}
               for kind in ("maps", "attractions")}
    if not args.inspect_only:
        target = ROOT / "data/local-assets.json"
        temporary = target.with_suffix(".json.tmp")
        try:
            temporary.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    failures = [row for row in ordered if "error" in row]
    report = {
        "inspectOnly": args.inspect_only,
        "counts": {kind: len(mapping[kind]) for kind in mapping},
        "nativeDimensionCounts": {
            kind: dict(Counter("x".join(map(str, row["nativeSize"])) for row in ordered
                               if row["kind"] == kind and "nativeSize" in row)) for kind in mapping},
        "dimensionAnomalies": [row for row in ordered if "dimensionAnomaly" in row],
        "failures": failures,
        "sources": ordered,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
