# Official public data integration

Discovery date: 2026-10-26 UTC. All data comes from the public visitor frontend at
`https://adventure.lotteworld.com/`. No account, session cookie, access token,
private mobile API, or management API is used. The currently served SPA entry was
`/assets/index-CVp8z9SH.js`. Asset names are build hashes, not stable API contracts.

## Run

Python 3.10+; standard library only:

```sh
python scripts/sync_official.py                 # complete catalog and details
python scripts/sync_official.py --waits-only    # 3 small public API requests
python scripts/sync_official.py --skip-details  # lists plus cached detail records
```

Output defaults to `data/official.json` and `data/waits.json`, relative to the
script's checkout, regardless of the working directory. Optional arguments:
`--output-dir PATH`, `--timeout 30`, `--workers 2` (maximum 3), and
`--request-interval 0.4` (minimum 0.25 seconds). No automatic retries. Requests
have timeouts and a 12 MiB response limit. Files are replaced atomically.
The command writes available results and exits 1 if a requested section fails.
An empty successful queue list is a valid result and exits 0.

A reasonable host schedule is a full refresh once daily and `--waits-only` no
more often than every 5 minutes. Avoid overlapping runs: the scheduler should
serialize runs/concurrency groups. This script does not create a GitHub workflow.
These are undocumented website implementation endpoints with no verified SLA,
permission for high-volume use, API key program, or guaranteed long-term schema.
Do not interpret availability as permission to bypass restrictions. If the
official service returns an access error, keep the unavailable state visible.

## Exact endpoints observed

All paths below use the base `https://adventure.lotteworld.com/api`.
`storeCd=HC01801` selects Seoul Adventure; `langCd=HC01701` selects Korean.
The SPA maps English to `HC01702`, Japanese to `HC01703`, and Chinese to
`HC01704`; this sync deliberately requests Korean facility names for matching.

| Method | Path | Successful response field | Purpose |
| --- | --- | --- | --- |
| GET | `/today/attraction-waits?storeCd=HC01801&langCd=HC01701` | `list` | Public queue display |
| GET | `/today/operating-hours?storeCd=HC01801&langCd=HC01701` | `data` | Date-specific park hours |
| GET | `/today/closed-list?storeCd=HC01801&langCd=HC01701` | `list` | Public closure/inspection notices |
| POST | `/enjoy/attrctn/list` | `pifAtrctMstVoList` | Attraction catalog |
| POST | `/enjoy/attrctn/detail` | `pifAtrctDtlVo` | Attraction restrictions, coordinates, floorplan |
| POST | `/enjoy/restaurant/list` | `pifRstntMstVoList` | Restaurant/snack catalog |
| POST | `/enjoy/restaurant/detail` | `pifRstntDtlVo` | Restaurant details, coordinates, floorplan |
| POST | `/enjoy/giftshop/list` | `pifGiftShopMstVoList` | Gift shop catalog |
| POST | `/enjoy/giftshop/detail` | `pifGiftShopDtlVo` | Gift shop details, coordinates, floorplan |
| POST | `/usage-guide/service/convenient-facilities/information/list` | `convFacVoList` | Public service facility categories |
| POST | `/usage-guide/service/convenient-facilities/information/detail` | `convFacDtlVo`, `convFacPstnVo` | Individual service locations |
| POST | `/enjoy/attrctn/imageSize` | `mapSizeVo` | Official detail map display dimensions |
| POST | `/usage-guide/service/guide-map/list` | `list` | Current downloadable visitor guide attachments |
| GET | `/adventure/communication/notice/list?storeCd=HC01801&langCd=HC01701&notiTypeCd=HC01601&pageIndex=1&notiCd=&q=` | `list`, `paging` | First page of public visitor notices |

List POST bodies:

```json
{"storeCd":"HC01801","langCd":"HC01701","deviceType":"pc","isApp":"N"}
```

Detail POST bodies add the matching ID parameter to `storeCd`, `langCd`,
and `deviceType`. Attraction: `"shopSysCd":"2286"`; restaurant:
`"srchRstntSeq":"57"`; gift shop: `"srchGiftSeq":"312"`; service facility:
`"srchConvnSeq":"1"`. IDs come from the corresponding current list, not
enumeration. Dimension and guide-map POST bodies need only the two base codes.
Requests use `Accept: application/json` and `Content-Type: application/json`.

The JSON envelope uses `"code":"200"`, `"message":"성공"`; HTTP 200 alone
does not establish successful data. The script checks the code, JSON type, and
required result field before marking a source as fetched.

The completed live fetch on the discovery date returned 46 attractions,
93 restaurants/snack locations, 26 gift shops, and 13 service categories.
All 178 detail requests succeeded. They supplied coordinates for all 46 rides,
92 dining locations, all 26 shops, and 38 individual service locations, plus
11 distinct floorplan assets. Restaurant `59` (`아이스팩토리`) has no verified
coordinate and is left without a marker. The notice snapshot has 10 items;
the closure snapshot has 6 items. Counts are observations, not fixed constants.

## Actual queue result and its limits

The public endpoint returned HTTP 200 and exactly:

```json
{"code":"200","message":"성공","list":[]}
```

At discovery there were **no verified queue minutes**. The attraction list and
the inspected detail response contained `"waitTm":""` and `"waitTmFrm":null`.
Empty data must never be displayed as 0 minutes or converted into estimated
queues. An empty feed alone does not establish that rides are open or closed.
The fetch occurred after midnight in Seoul; that context is not proof of why
the feed is empty or of what the feed supplies during park hours.

The frontend's queue component reads `atrctNm`, `pstnCdNm`, `sttsSe`, `waitTm`,
`atrctSttsCd`, and `atrctSttsCdNm`. It displays `waitTm` only when
`sttsSe === "OPEN"`. This reader follows that check and additionally requires a
nonnegative integer value. This is a decoder for the observed frontend schema,
**not a claim that a nonempty live queue response has been verified**.

`data/waits.json` has `available: false` when no minutes can be verified.
Every known attraction still has a record with `waitMinutes: null` and
`status: "unknown"` if absent from the feed. A successful nonempty feed can
produce `status: "live"`; valid responses without minutes produce `empty` or
`no-minutes`. Request/schema failures produce `error` and clear every minute
to null, even when a previous file contained numeric waits.

`observedAt` is the time this reader fetched a row, not a ride operator's update
time. The API's update cadence and timestamp are unverified; consequently
`sourceUpdatedAt` is null. Clients must also suppress numeric waits once
`expiresAt` has passed (5 minutes after a successful fetch) or if
`source.stale` is true. A static deployment must implement this expiration;
a snapshot alone is not a real-time service.

## Official map data: independent coordinate space

The detail APIs expose official floorplan pixels, not geographic coordinates
and not positions on the downloadable PDF. Verified example:

```json
{
  "shopSysCd":"2286",
  "atrctNm":"아트란티스",
  "pstnCd":"HA00105",
  "pstnCdNm":"매직아일랜드",
  "pstnXcrd":"410",
  "pstnYcrd":"155",
  "mapFileList":[{
    "id":"197a0e1c0229",
    "flPath":"/202604/02/2026040219d4c0ff96c20"
  }]
}
```

The associated image URL is:
`https://adventure.lotteworld.com/api/upload/202604/02/2026040219d4c0ff96c20`.
The official dimension endpoint returned
`{"imgWidth":"570","imgHeight":"427"}` inside `mapSizeVo`. The frontend
places markers using `left: pstnXcrd + "px"`, `top: pstnYcrd + "px"`.
The recorded dimensions describe the official display coordinate system; they
must not be inferred from a new PDF's dimensions or from an image's native pixels.

The service detail API returns a `convFacPstnVo` array grouped by floor. Each
group contains `code`, `codeNm`, `mapFileList`, and `convFacCrdVoList`. Its
location records contain `pstnXcrd`, `pstnYcrd`, `pstnDesc`, and sometimes
`poiSeq`. Guest Relations (`srchConvnSeq=1`) was verified at `(299,75)` on
Adventure 1F (`HA00101`). Individual points are preserved; repeated names on
different floors are not collapsed.

`official.maps` contains distinct official map assets keyed by floor and image.
Attractions/restaurants/shops expose their marker under `detail.position` and
their matching map under `detail.maps`. Service categories expose multiple
markers under `detail.locations`. All positions explicitly declare
`coordinateSystem: "official-floorplan-pixels"` and a matching `mapId`.
Use these only with their own `imageUrl`; overlaying them directly on the PDF
would misplace markers. Missing coordinates remain null. There is no verified
public walking network, floor connector graph, accessible route graph, or
lat/lng dataset in the inspected public visitor frontend. Its digital navigation
button launches the official mobile app. No mobile or staff-only endpoints
were queried.

Verified source floor codes:

| Code | Official name | Relation to the guide map |
| --- | --- | --- |
| HA00101 | 어드벤처 1층 | Adventure 1F |
| HA00102 | 어드벤처 2층 | Adventure 2F |
| HA00103 | 어드벤처 3층 | Adventure 3F |
| HA00104 | 어드벤처 4층 | Adventure 4F |
| HA00105 | 매직아일랜드 | Magic Island |
| HA00106 | 언더랜드 B1층 | Underland B1 |
| HA00107 | 키디존 | Separate official Kiddy Zone image |
| HA00108 | 파크 외 1층 | Outside park, 1F |
| HA00109 | 쇼핑몰 B1층 | Shopping mall B1 |
| HA00110 | 파크 외 B3층 | Outside park, B3 |
| HA00111 | 저자거리 | Separate official folk museum dining street image |

The extra outside/museum floorplans must not be mistaken for main park floors
with a similar floor number. These labels describe the returned public data;
they do not prove park-ticket access or a walking connection.

Guide-map attachment IDs are discovered from the guide-map list, not hardcoded.
The returned Korean/English/Chinese/Japanese attachment IDs map to:

```text
/api/common/download-view-file/download?atchFileId=RETURNED_ID&seq=1
```

## File schema and freshness

`official.json` supplies `attractions`, `restaurants`, `shops`, `facilities`,
`maps`, `guideMaps`, `news`, `mapDimensions`, `operatingHours`, and `closures`.
It also exposes a top-level `source` object with `name`, `url`, `fetchedAt`, and
`stale`. Catalog display fields are `id`, `name`, `url`, `image`, `description`,
`restrictions` (a plain string or null), and `status` (the official Korean label
or null). `url`/`image` alias `officialUrl`/`imageUrl`. Attraction height limits
and any source use-guide text form `restrictions`; they are not a comprehensive
medical, accessibility, or operational eligibility decision.
Facility IDs are stable source IDs prefixed with their type (`ride-2286`,
`restaurant-57`, `shop-312`, `facility-1`). Names/locations/menu descriptions
are HTML-decoded into plain text, and public thumbnail URLs are retained.
Full public file metadata and incidental backend session strings are discarded.
Catalog records deduplicate normalized names within the same floor and type,
retaining source IDs under `aliases`; branches on different floors remain.
This sync never infers new physical map markers from a name match.
The PDF marker IDs in `park.json`, such as `ride-1`, use guide numbers and
are a separate identifier system. Join supplemental catalog facts by verified
normalized name, retaining unmatched records explicitly; do not equate numeric
suffixes. `waits.rides[].updatedAt` aliases `observedAt`, and does not claim to
be the ride operator's update time. The nullable source update time remains
`sourceUpdatedAt: null`.

Each record's `source` describes list data; its `detail.source` describes detail
data. Every source includes the exact URL, method, actual successful `fetchedAt`,
request attempt time, HTTP status when known, and POST body when applicable.
Top-level `official.fetchedAt` is the oldest initial section fetch in the last
complete full refresh; `--waits-only` and `--skip-details` do not renew it.
Hours preserve the API's `operDt` date: do not relabel those hours as another
day's hours using the viewer's timezone. Status labels are returned literally
from the public source; `정상운행` in a catalog does not by itself prove a ride
is accepting guests at the viewer's current time. `closures` is a separate
source snapshot, not a complete proof of all other rides being open.

After a network/JSON/schema error, an old source's successful `fetchedAt` is
preserved, `stale` is true, and the latest failed `attemptedAt`/`error` is stored.
Newly failed sources have `fetchedAt: null`. Failed detail refreshes preserve
prior detail facts and their successful source time. `sync.complete` and
`sync.errors` describe the full run; `liveSync` describes the three live calls.
Neither `checkedAt`, `attemptedAt`, nor `completedAt` means data was refreshed.
Always use the source for the particular field when showing freshness.

News is intentionally a bounded first page, including returned pinned items;
`newsPaging` preserves source pagination. These are visitor notices, not an
exhaustive news archive. The site's public catalog can differ from the guide
PDF because the documents and web records update independently.
