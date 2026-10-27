# 공식 카탈로그 연동

공식 방문객 웹사이트 `https://adventure.lotteworld.com/`의 공개 API를 사용합니다. API 키·로그인·관리자 API는 사용하지 않습니다. 웹사이트의 내부 구현용 경로이므로 장기 제공이나 응답 형식이 보장된 계약 API는 아닙니다.

## 실행

Python 3.10 이상, 표준 라이브러리만 사용합니다.

```sh
python scripts/sync_official.py
python scripts/sync_official.py --skip-details
```

`data/official.json`에 카탈로그·상세 위치·운영시간·휴무 정보를 저장합니다. GitHub Actions는 매일 한국 시간 08:47에 한 번 갱신하도록 설정되어 있습니다. `--output-dir PATH`, `--timeout 30`, `--workers 2`, `--request-interval 0.4`를 지원합니다. 실패한 수집 시각을 성공 시각으로 바꾸지 않으며, 요청마다 시간·응답 크기 제한을 둡니다.

## 주요 경로

기준 URL은 `https://adventure.lotteworld.com/api`입니다. 서울 어드벤처는 `storeCd=HC01801`, 한국어는 `langCd=HC01701`입니다.

| 방식 | 경로 | 응답 필드 |
| --- | --- | --- |
| POST | `/enjoy/attrctn/list` | `pifAtrctMstVoList` |
| POST | `/enjoy/attrctn/detail` | `pifAtrctDtlVo` |
| POST | `/enjoy/restaurant/list` | `pifRstntMstVoList` |
| POST | `/enjoy/restaurant/detail` | `pifRstntDtlVo` |
| POST | `/enjoy/giftshop/list` | `pifGiftShopMstVoList` |
| POST | `/enjoy/giftshop/detail` | `pifGiftShopDtlVo` |
| POST | `/usage-guide/service/convenient-facilities/information/list` | `convFacVoList` |
| POST | `/usage-guide/service/convenient-facilities/information/detail` | `convFacDtlVo`, `convFacPstnVo` |
| POST | `/enjoy/attrctn/imageSize` | `mapSizeVo` |
| POST | `/usage-guide/service/guide-map/list` | `list` |
| GET | `/today/operating-hours` | `data` |
| GET | `/today/closed-list` | `list` |

목록 POST 본문은 `{"storeCd":"HC01801","langCd":"HC01701","deviceType":"pc","isApp":"N"}`입니다. 상세 요청은 목록에서 받은 ID를 추가합니다. 어트랙션 `shopSysCd`, 식당 `srchRstntSeq`, 샵 `srchGiftSeq`, 편의시설 `srchConvnSeq`입니다. HTTP 상태뿐 아니라 JSON `code`와 필수 필드도 검증합니다.

## 지도 좌표

공식 상세 API의 위치는 **해당 공식 그림의 픽셀 좌표**입니다. `mapSizeVo`에서 확인된 표시는 570×427입니다. 위경도가 아니며 PDF 좌표계와도 다릅니다. 별도 공식 위치 지도에서만 사용합니다. PDF 지도에 겹치거나 GPS 지리 기준점으로 오용하지 않습니다.

`park.json`의 `ride-1` 같은 ID는 가이드맵 번호입니다. `official.json`의 공식 시설 ID와 숫자가 같다고 연결하지 않고 이름·층 등을 검증해 연결합니다. 원본에서 위치가 빠진 시설은 임의로 좌표를 채우지 않습니다.

GPS와 조감도 간 추정은 [LOCATION.md](LOCATION.md)에 기록된 별도 공개 지리 기준점과 세션 내 사용자 보정으로 수행합니다.
