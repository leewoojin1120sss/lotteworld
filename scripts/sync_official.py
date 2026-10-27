#!/usr/bin/env python3
"""Fetch Lotte World Adventure's public visitor APIs using only the stdlib.

Full refresh: python scripts/sync_official.py
No login or management endpoints.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import copy
from datetime import datetime, timezone
import html
from html.parser import HTMLParser
import http.client
import json
import math
from pathlib import Path
import re
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request


ORIGIN = "https://adventure.lotteworld.com"
BASE = ORIGIN + "/api"
PARAMS = {"storeCd": "HC01801", "langCd": "HC01701"}
ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 12 * 1024 * 1024
CATEGORIES = {
    "attractions": {
        "path": "/enjoy/attrctn/list", "key": "pifAtrctMstVoList",
        "id": "shopSysCd", "name": "atrctNm", "prefix": "ride",
        "detailPath": "/enjoy/attrctn/detail", "detailKey": "pifAtrctDtlVo",
        "detailParam": "shopSysCd", "page": "/enjoy/attrctn/detail?shopSysCd=",
    },
    "restaurants": {
        "path": "/enjoy/restaurant/list", "key": "pifRstntMstVoList",
        "id": "rstntSeq", "name": "rstntNm", "prefix": "restaurant",
        "detailPath": "/enjoy/restaurant/detail", "detailKey": "pifRstntDtlVo",
        "detailParam": "srchRstntSeq", "page": "/enjoy/restaurant/detail?srchRstntSeq=",
    },
    "shops": {
        "path": "/enjoy/giftshop/list", "key": "pifGiftShopMstVoList",
        "id": "giftSeq", "name": "giftNm", "prefix": "shop",
        "detailPath": "/enjoy/giftshop/detail", "detailKey": "pifGiftShopDtlVo",
        "detailParam": "srchGiftSeq", "page": "/enjoy/giftshop/detail?srchGiftSeq=",
    },
    "facilities": {
        "path": "/usage-guide/service/convenient-facilities/information/list",
        "key": "convFacVoList", "id": "convnSeq", "name": "convnEquNm", "prefix": "facility",
        "detailPath": "/usage-guide/service/convenient-facilities/information/detail",
        "detailKey": "convFacDtlVo", "detailParam": "srchConvnSeq",
        "page": "/usage-guide/service/convenient-facilities/information/detail?srchConvnSeq=",
    },
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)

    def handle_starttag(self, tag, attrs):
        if tag in ("p", "br", "li", "div"):
            self.parts.append(" ")


def plain(value):
    if value is None:
        return None
    value = str(value)
    for _ in range(2):
        value = html.unescape(value)
    parser = PlainText()
    parser.feed(value.replace("\\r", " ").replace("\\n", " "))
    return re.sub(r"\s+", " ", "".join(parser.parts)).strip() or None


def number(value):
    if isinstance(value, bool) or value is None:
        return None
    try:
        n = float(str(value).strip())
    except (ValueError, TypeError, OverflowError):
        return None
    if not math.isfinite(n) or n < 0:
        return None
    return int(n) if n.is_integer() else n


def upload_url(path):
    if not isinstance(path, str) or not path.startswith("/") or path.startswith("//"):
        return None
    return BASE + "/upload" + path


def first_file(row, *keys):
    for key in keys:
        files = row.get(key)
        if isinstance(files, list):
            for file in files:
                if isinstance(file, dict) and upload_url(file.get("flPath")):
                    return file
    return None


def image_url(row):
    file = first_file(row, "thmbFileListPc", "thmbFileList", "imgFileListPc", "imgFileList")
    return upload_url(file["flPath"]) if file else None


def read_json(path):
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def stale_source(previous, failure):
    result = copy.deepcopy(previous or {})
    # fetchedAt describes the old successful response; attemptedAt describes failure.
    result.update({k: v for k, v in failure.items() if k != "fetchedAt"})
    result.setdefault("fetchedAt", None)
    result["stale"] = True
    return result


class Client:
    def __init__(self, timeout=30, interval=0.4):
        self.timeout = timeout
        self.interval = interval
        self.lock = threading.Lock()
        self.next_request = 0.0
        self.opener = urllib.request.build_opener()

    def fetch(self, path, method="GET", params=None, field=None, kind=list):
        payload = dict(params or PARAMS)
        url = BASE + path
        body = None
        if method == "GET":
            url += "?" + urllib.parse.urlencode(payload)
        else:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        source = {"url": url, "method": method, "fetchedAt": None, "attemptedAt": now(), "stale": False}
        if method == "POST":
            source["requestBody"] = payload
        try:
            with self.lock:
                delay = max(0, self.next_request - time.monotonic())
                if delay:
                    time.sleep(delay)
                self.next_request = time.monotonic() + self.interval
            req = urllib.request.Request(url, data=body, method=method, headers={
                "Accept": "application/json", "Content-Type": "application/json",
                "User-Agent": "LotteWorldMap/1.0 (public visitor information sync)",
            })
            with self.opener.open(req, timeout=self.timeout) as response:
                source["httpStatus"] = response.status
                source["serverDate"] = response.headers.get("Date")
                raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("Response exceeds the 12 MiB limit")
            doc = json.loads(raw.decode("utf-8-sig"))
            if not isinstance(doc, dict) or str(doc.get("code")) != "200":
                raise ValueError("API did not return a successful code=200 object")
            if field is not None and not isinstance(doc.get(field), kind):
                raise ValueError("Missing or invalid response field: " + field)
            if field is not None and kind is list and not all(isinstance(row, dict) for row in doc[field]):
                raise ValueError("Non-object in response field: " + field)
            source["fetchedAt"] = now()  # only after HTTP, JSON, API-code and schema validation
            return doc, source
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, UnicodeError, http.client.HTTPException) as exc:
            source["stale"] = True
            source["error"] = str(exc)
            if isinstance(exc, urllib.error.HTTPError):
                source["httpStatus"] = exc.code
            return None, source


def normalize(row, category, source):
    config = CATEGORIES[category]
    official_id = str(row[config["id"]])
    record = {
        "id": config["prefix"] + "-" + official_id,
        "officialId": official_id,
        "name": plain(row.get(config["name"])),
        "floorCode": row.get("pstnCd"), "floorName": plain(row.get("pstnCdNm")),
        "location": plain(row.get("pstnDesc")),
        "description": plain(row.get("introCntn") or row.get("convnEquDesc")),
        "imageUrl": image_url(row),
        "officialUrl": ORIGIN + config["page"] + urllib.parse.quote(official_id),
        "source": source,
    }
    if category == "attractions":
        record.update({
            "heightMinCm": number(row.get("bgnTall")), "heightMaxCm": number(row.get("endTall")),
            "operatingStatus": {"code": row.get("atrctSttsCd"), "label": plain(row.get("atrctSttsCdNm"))},
            "operatingHours": {"open": row.get("atrctBgnTmFrm"), "close": row.get("atrctEndTmFrm")},
            "singleRider": row.get("snglYn") == "Y", "boardingReservation": row.get("brdngResvYn") == "Y",
            "infantFacility": row.get("infntEquYn") == "Y", "accompanyingAdultAllowed": row.get("acmpyYn") == "Y",
        })
    if category in ("restaurants", "shops"):
        record.update({
            "menu": plain(row.get("rstntMenuNm") or row.get("gdsNm")),
            "weekdayHours": plain(row.get("wkdySalTmDesc")), "weekendHours": plain(row.get("wkendSalTmDesc")),
            "phone": row.get("rstntTelno") or row.get("shopTelno"),
        })
    if category == "restaurants":
        record.update({"cuisine": plain(row.get("rstntCsfCdNm")), "priceDescription": plain(row.get("prcCntn")),
                       "hasSeats": row.get("seatYn") == "Y", "groupsAllowed": row.get("grupYn") == "Y"})
    if category == "facilities":
        record["nameEn"] = plain(row.get("convnEquEngNm"))
    return record


def deduplicate(records):
    # Keep branch locations on different floors. Merge duplicate names on one floor,
    # while retaining all source IDs so an ID-based map join remains possible.
    result, seen = [], {}
    for record in records:
        name = unicodedata.normalize("NFKC", record.get("name") or "").casefold()
        name = re.sub(r"\s+", "", name)
        key = (name, record.get("floorCode")) if name else (record["id"], None)
        if key not in seen:
            seen[key] = record
            record["aliases"] = [record["officialId"]]
            result.append(record)
        else:
            first = seen[key]
            first["aliases"].append(record["officialId"])
            if record.get("detail"):
                first.setdefault("additionalDetails", []).append(record["detail"])
    return result


def map_entry(row, source, dimensions, floor_code=None, floor_name=None):
    file = first_file(row, "mapFileList")
    if not file:
        return None
    return {
        "id": "official-map-" + str(file.get("id") or file["flPath"].rsplit("/", 1)[-1]),
        "floorCode": floor_code or row.get("pstnCd"),
        "floorName": plain(floor_name or row.get("pstnCdNm")),
        "imageUrl": upload_url(file["flPath"]), "fileName": file.get("flNm"),
        "width": dimensions.get("width"), "height": dimensions.get("height"),
        "coordinateSystem": "official-floorplan-pixels", "origin": "top-left",
        "source": source,
    }


def position(row, floor_map):
    x, y = number(row.get("pstnXcrd")), number(row.get("pstnYcrd"))
    if x is None or y is None:
        return None
    return {"x": x, "y": y, "floorCode": row.get("pstnCd") or (floor_map or {}).get("floorCode"),
            "mapId": floor_map["id"] if floor_map else None,
            "coordinateSystem": "official-floorplan-pixels", "poiSeq": row.get("poiSeq"),
            "location": plain(row.get("pstnDesc"))}


def normalize_detail(doc, category, source, dimensions):
    row = doc[CATEGORIES[category]["detailKey"]]
    result = {
        "source": source, "position": None, "maps": [], "locations": [],
        "description": plain(row.get("cntn") or row.get("dtlsCntn")),
        "useGuide": plain(row.get("utztnGuideCntn")), "tips": plain(row.get("plusTipDsctn")),
        "tags": [part.strip() for part in (plain(row.get("dspTagNm")) or "").split(",") if part.strip()],
    }
    if category == "facilities":
        floor_groups = doc.get("convFacPstnVo")
        if floor_groups is not None and not isinstance(floor_groups, list):
            raise ValueError("convFacPstnVo is not a list")
        for group in floor_groups or []:
            floor_map = map_entry(group, source, dimensions, group.get("code"), group.get("codeNm"))
            if floor_map:
                result["maps"].append(floor_map)
            for location in group.get("convFacCrdVoList") or []:
                point = position(location, floor_map)
                if point:
                    point["officialLocationId"] = str(location.get("convnDtlOrd", ""))
                    point["source"] = source
                    result["locations"].append(point)
    else:
        floor_map = map_entry(row, source, dimensions)
        result["position"] = position(row, floor_map)
        if floor_map:
            result["maps"] = [floor_map]
    if category == "attractions":
        result.update({
            "heightMinCm": number(row.get("bgnTall")), "heightMaxCm": number(row.get("endTall")),
            "ageMin": number(row.get("bgnAge")), "ageMax": number(row.get("endAge")),
            "accompanyingHeightMinCm": number(row.get("acmpyBgnTall")),
            "accompanyingHeightMaxCm": number(row.get("acmpyEndTall")),
            "capacity": number(row.get("brdngPnum")),
            "operatingStatus": {"code": row.get("atrctSttsCd"), "label": plain(row.get("atrctSttsCdNm"))},
        })
    return result


def sync_full(client, old, workers, skip_details):
    doc = copy.deepcopy(old)
    doc.update({"schemaVersion": 1, "park": {"name": "롯데월드 어드벤처", "nameEn": "Lotte World Adventure Seoul",
                 "timezone": "Asia/Seoul", **PARAMS}, "attemptedAt": now()})
    doc.setdefault("sources", {})
    errors = []
    reqs = [(name, config["path"], "POST", {**PARAMS, "deviceType": "pc", "isApp": "N"}, config["key"], list)
            for name, config in CATEGORIES.items()]
    reqs += [
        ("mapDimensions", "/enjoy/attrctn/imageSize", "POST", PARAMS, "mapSizeVo", dict),
        ("guideMaps", "/usage-guide/service/guide-map/list", "POST", PARAMS, "list", list),
        ("news", "/adventure/communication/notice/list", "GET",
         {**PARAMS, "notiTypeCd": "HC01601", "pageIndex": 1, "notiCd": "", "q": ""}, "list", list),
    ]

    def fetch(req):
        name, path, method, params, key, kind = req
        body, source = client.fetch(path, method, params, key, kind)
        if body is not None and name in CATEGORIES:
            config = CATEGORIES[name]
            if any(row.get(config["id"]) is None or not plain(row.get(config["name"])) for row in body[key]):
                body = None
                source.update({"error": "Catalog schema: record lacks required ID/name", "fetchedAt": None, "stale": True})
        return name, body, source

    fetched = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for name, body, source in pool.map(fetch, reqs):
            if body is None:
                doc["sources"][name] = stale_source(old.get("sources", {}).get(name), source)
                if name in CATEGORIES:
                    for record in doc.get(name, []):
                        record["source"] = stale_source(record.get("source"), source)
                errors.append({"section": name, **source})
                print(name + ": ERROR " + source.get("error", "unknown"), file=sys.stderr, flush=True)
            else:
                fetched[name] = body
                doc["sources"][name] = source
                print(name + ": fetched", flush=True)

    size = fetched.get("mapDimensions", {}).get("mapSizeVo")
    if size:
        doc["mapDimensions"] = {"width": number(size.get("imgWidth")), "height": number(size.get("imgHeight")),
                                "source": doc["sources"]["mapDimensions"]}
    dimensions = doc.get("mapDimensions", {})
    jobs = []
    for category, config in CATEGORIES.items():
        if category not in fetched:
            doc.setdefault(category, [])
            continue
        previous = {record["officialId"]: record for record in old.get(category, [])}
        records = []
        for row in fetched[category][config["key"]]:
            if row.get(config["id"]) is None or not plain(row.get(config["name"])):
                errors.append({"section": category, "error": "Record lacks required ID/name", "attemptedAt": now()})
                continue
            record = normalize(row, category, doc["sources"][category])
            previous_detail = previous.get(record["officialId"], {}).get("detail")
            if previous_detail:
                record["detail"] = copy.deepcopy(previous_detail)
            records.append(record)
            if not skip_details:
                jobs.append((category, record))
        doc[category] = records

    def fetch_detail(job):
        category, record = job
        config = CATEGORIES[category]
        body, source = client.fetch(config["detailPath"], "POST",
                                   {**PARAMS, "deviceType": "pc", config["detailParam"]: record["officialId"]},
                                   config["detailKey"], dict)
        if body is not None:
            try:
                return category, record, normalize_detail(body, category, source, dimensions), source
            except (ValueError, TypeError, KeyError, AttributeError) as exc:
                source.update({"error": "Detail schema: " + str(exc), "fetchedAt": None, "stale": True})
        return category, record, None, source

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        for index, (category, record, detail, source) in enumerate(pool.map(fetch_detail, jobs), 1):
            if detail is None:
                prior = record.get("detail", {})
                prior["source"] = stale_source(prior.get("source"), source)
                record["detail"] = prior
                errors.append({"section": category + "/" + record["officialId"], **source})
            else:
                record["detail"] = detail
            if index % 20 == 0 or index == len(jobs):
                print("details: " + str(index) + "/" + str(len(jobs)), flush=True)

    maps = {}
    for category in CATEGORIES:
        doc[category] = deduplicate(doc.get(category, []))
        for record in doc[category]:
            detail = record.get("detail", {})
            for floor_map in detail.get("maps", []):
                if detail.get("source", {}).get("stale"):
                    floor_map["source"] = stale_source(floor_map.get("source"), detail["source"])
                key = (floor_map["floorCode"], floor_map["imageUrl"])
                previous_map = maps.get(key)
                if previous_map is None or (previous_map["source"].get("stale") and not floor_map["source"].get("stale")):
                    maps[key] = floor_map
    doc["maps"] = sorted(maps.values(), key=lambda item: (item.get("floorCode") or "", item["id"]))
    if "guideMaps" in fetched:
        doc["guideMaps"] = []
        for row in fetched["guideMaps"]["list"]:
            for language, suffix in [("ko", ""), ("en", "2"), ("zh", "3"), ("ja", "4")]:
                attachment = row.get("atchFileId" + suffix)
                if attachment:
                    doc["guideMaps"].append({"language": language, "name": plain(row.get("guideMapNm")),
                        "url": BASE + "/common/download-view-file/download?" + urllib.parse.urlencode({"atchFileId": attachment, "seq": 1}),
                        "source": doc["sources"]["guideMaps"]})
    if "news" in fetched:
        doc["news"] = [{"id": str(row.get("notiSeq")), "title": plain(row.get("titl")),
                        "publishedAt": row.get("regDtm"), "updatedAt": row.get("updDtm"),
                        "category": plain(row.get("notiNm")), "pinned": row.get("upendFixYn") == "Y",
                        "url": ORIGIN + "/communication/notice/detail?" + urllib.parse.urlencode({"notiSeq": row.get("notiSeq"), "upendFixYn": row.get("upendFixYn") or "N"}),
                        "source": doc["sources"]["news"]} for row in fetched["news"]["list"]]
        doc["newsPaging"] = fetched["news"].get("paging")
    doc["sync"] = {"completedAt": now(), "complete": not errors, "detailsRequested": not skip_details, "errors": errors}
    if not errors and not skip_details:
        doc["fetchedAt"] = min(source["fetchedAt"] for source in doc["sources"].values()
                               if source.get("fetchedAt") and not source.get("stale"))
    else:
        doc["fetchedAt"] = old.get("fetchedAt")
    return doc


def sync_operating_information(client, official, workers):
    requests = [("operatingHours", "/today/operating-hours", "data", dict),
                ("closures", "/today/closed-list", "list", list)]
    def fetch(item):
        name, path, key, kind = item
        body, source = client.fetch(path, field=key, kind=kind)
        return name, body, source
    errors = []
    for name, body, source in concurrent_results(fetch, requests, workers):
        previous = official.get(name, {})
        if body is None:
            errors.append({"section": name, **source})
            previous["source"] = stale_source(previous.get("source"), source)
            official[name] = previous
        elif name == "operatingHours":
            raw = body["data"]
            official[name] = {"date": raw.get("operDt"), "open": raw.get("bgnTmFmt"),
                              "close": raw.get("endTmFmt"), "source": source}
        else:
            official[name] = {"rides": [{"officialId": str(row.get("shopSysCd")), "name": plain(row.get("atrctNm")),
                "floorCode": row.get("pstnCd"), "statusCode": row.get("atrctSttsCd"),
                "statusLabel": plain(row.get("atrctSttsCdNm"))} for row in body["list"]], "source": source}
        print(name + (": fetched" if body is not None else ": ERROR " + source.get("error", "unknown")), flush=True)
    official["liveSync"] = {"checkedAt": now(), "complete": not errors, "errors": errors}


def concurrent_results(function, items, workers):
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        yield from pool.map(function, items)


def frontend_fields(official):
    """Small display aliases; source IDs and detailed provenance remain available."""
    official["source"] = {
        "name": "Lotte World Adventure official public visitor APIs", "url": ORIGIN,
        "fetchedAt": official.get("fetchedAt"),
        "stale": not official.get("sync", {}).get("complete", False),
    }
    for category in CATEGORIES:
        for record in official.get(category, []):
            record["url"] = record.get("officialUrl")
            record["image"] = record.get("imageUrl")
            record["status"] = record.get("operatingStatus", {}).get("label")
            limits = []
            if record.get("heightMinCm"):
                limits.append(str(record["heightMinCm"]) + "cm 이상")
            if record.get("heightMaxCm"):
                limits.append(str(record["heightMaxCm"]) + "cm 이하")
            guide = record.get("detail", {}).get("useGuide")
            if guide:
                limits.append(guide)
            record["restrictions"] = " · ".join(limits) or None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-details", action="store_true", help="Refresh catalog lists, retaining cached detail timestamps")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data")
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--workers", type=int, choices=(1, 2, 3), default=2)
    parser.add_argument("--request-interval", type=float, default=0.4, help="Minimum seconds between requests, at least 0.25")
    args = parser.parse_args()
    if args.timeout <= 0 or args.timeout > 60 or args.request_interval < 0.25:
        parser.error("timeout must be 0 < seconds <= 60 and request-interval must be >= 0.25")
    official_path = args.output_dir / "official.json"
    previous = read_json(official_path)
    client = Client(args.timeout, args.request_interval)
    official = sync_full(client, previous, args.workers, args.skip_details)
    sync_operating_information(client, official, args.workers)
    frontend_fields(official)
    save_json(official_path, official)
    complete = official.get("liveSync", {}).get("complete", False) and official.get("sync", {}).get("complete", False)
    print(json.dumps({"complete": complete,
                      "counts": {category: len(official.get(category, [])) for category in CATEGORIES}}, ensure_ascii=False))
    return 0 if complete else 1


if __name__ == "__main__":
    sys.exit(main())
