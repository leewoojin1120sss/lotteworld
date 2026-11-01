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

## 운휴 배지의 브라우저 갱신

`app.js`는 접속 시와 화면이 보이는 동안 5분마다 공식 GET `/today/closed-list`와 `/today/operating-hours`를 직접 조회합니다. 2026-11-02 GitHub Pages Origin을 넣은 실제 응답에서 CORS 허용을 확인했습니다. 인증·쿠키·리퍼러·사용자 위치를 전송하지 않습니다. 15초 제한과 수동 조회 30초 간격을 적용합니다. 외부 API/CORS 정책이 바뀌면 직접 갱신이 실패할 수 있습니다.

공식 시설 ID로 연결하며, 가이드맵 번호나 비슷한 이름만으로 상태를 추측하지 않습니다. 한국 날짜가 같고 성공한 확인 시각에서 30분 이내일 때만 운휴/점검 배지와 추천 제외를 적용합니다. 목록에 없다는 것은 `운휴 공지 없음`이며 정상 운행 확인과 다릅니다. 누락·연결 미확인·이전 날짜·오래된 자료는 `운휴 확인 필요` 또는 `이전 정보`입니다.

직접 조회에 실패해도 마지막 성공 시각은 갱신하지 않습니다. 기존 하루 한 번 수집하는 `official.json`의 운휴 자료가 예비 자료이며 똑같은 날짜·시간 기준을 적용합니다. 외부 직접 조회는 Service Worker에 캐시하지 않습니다. 백그라운드에서는 주기 조회를 멈추고 복귀 시 필요한 경우 갱신합니다. 대기시간 API는 호출하지 않습니다.
