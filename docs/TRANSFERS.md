# 층간 연결 대조 · 2026-11-05

## 검증 범위

**실제 출입구 연결, 승강기 정차층, 에스컬레이터 운행방향을 현장에서 검증한 자료는 없다.** 아래 30개 연결은 2026 공식 가이드의 이동 지시선과 층별 건물·벽·승강기·계단·에스컬레이터 그림을 대조한 **도면 대응 추정**이다. 기호의 근접도나 순번을 런타임에서 자동 매칭하지 않는다.

원본: [2026 국문 가이드](../assets/guide-2026.pdf), SHA-256 `d90f85d30cd0e88abc7fdb0ddd42a76cfe48b285b387d4c18d9fcf3e36a4ec03`.

69개 이동시설 중 43개에 대응 연결을 기록하고, 나머지 26개는 연결 미확인으로 명시했다. `data/walkways.json`의 `crossFloorConnectionsVerified: false`를 유지한다. 별도 공식 장소 API의 편의시설 목록에는 이동시설 개별 연결/정차층 데이터가 없어 이를 근거로 확인됐다고 표시하지 않는다.

## 화면과 길찾기

- 상세의 **추정 연결 위치**에서 위·아래층 대응 기호로 이동한다. 이 버튼은 지도 미리보기이며 내 위치나 GPS 층을 바꾸지 않는다.
- 모든 연결에 **도면 대조 · 현장 미확인**을 표시한다. 에스컬레이터 기호는 설비군 대응이며 실제 개별 기계의 상·하행 방향을 뜻하지 않는다.
- 층간 길찾기는 명시된 연결과 기존 층별 통로를 함께 탐색한다. 단순히 가까운 시설이나 목적지와 무관한 막다른 연결은 추천하지 않는다.
- 계단/에스컬레이터/승강기와 혼합 경로를 구하고, 통로 길이를 지도 폭으로 정규화한 참고 비용으로 정렬한다. 실제 최단 거리·소요시간·무장애 경로의 보증이 아니다.
- 다음 도착층과 대응 시설을 미리 볼 수 있다. **도착했어요 · 계속**을 눌렀을 때만 도착 기호를 수동 현위치로 지정하고 다음 구간을 다시 계산한다. 한 번에 목적지 층으로 건너뛰지 않는다.
- 매직아일랜드 외측 진입부, 플라이벤처 전용 지하 공간, 지도 밖 민속박물관 도착 지점 등을 일반 층간 연결에 섞지 않는다. 연결 자료가 없는 구역에는 경로가 없다고 알린다.

## 대응표

아래 ID는 원본 기호 식별용이다. **동일 ID 순번이 연결 근거인 것은 아니다.** 각 행의 근거와 출처 쪽수는 [transfers.json](../data/transfers.json)에 있다.

| 종류 | 출발 기호 | 도착 기호 | 자료 수준 |
| --- | --- | --- | --- |
| 엘리베이터 | `facility-1F-elevator-2` | `facility-2F-elevator-4` | 도면 대응 추정 |
| 엘리베이터 | `facility-2F-elevator-4` | `facility-3F-elevator-1` | 도면 대응 추정 |
| 엘리베이터 | `facility-3F-elevator-1` | `facility-4F-elevator-1` | 도면 대응 추정 |
| 엘리베이터 | `facility-1F-elevator-3` | `facility-2F-elevator-2` | 도면 대응 추정 |
| 엘리베이터 | `facility-2F-elevator-2` | `facility-3F-elevator-2` | 도면 대응 추정 |
| 엘리베이터 | `facility-3F-elevator-2` | `facility-4F-elevator-2` | 도면 대응 추정 |
| 엘리베이터 | `facility-1F-elevator-4` | `facility-2F-elevator-3` | 도면 대응 추정 |
| 엘리베이터 | `facility-2F-elevator-3` | `facility-3F-elevator-3` | 도면 대응 추정 |
| 엘리베이터 | `facility-3F-elevator-3` | `facility-4F-elevator-3` | 도면 대응 추정 |
| 에스컬레이터 | `facility-1F-escalator-2` | `facility-2F-escalator-2` | 도면 대응 추정 |
| 에스컬레이터 | `facility-2F-escalator-2` | `facility-3F-escalator-1` | 도면 대응 추정 |
| 에스컬레이터 | `facility-3F-escalator-1` | `facility-4F-escalator-1` | 도면 대응 추정 |
| 에스컬레이터 | `facility-1F-escalator-1` | `facility-2F-escalator-1` | 도면 대응 추정 |
| 에스컬레이터 | `facility-2F-escalator-1` | `facility-3F-escalator-2` | 도면 대응 추정 |
| 에스컬레이터 | `facility-3F-escalator-2` | `facility-4F-escalator-2` | 도면 대응 추정 |
| 에스컬레이터 | `facility-1F-escalator-3` | `facility-2F-escalator-3` | 도면 대응 추정 |
| 계단 | `facility-3F-stairs-1` | `facility-4F-stairs-1` | 도면 대응 추정 |
| 계단 | `facility-3F-stairs-3` | `facility-4F-stairs-3` | 도면 대응 추정 |
| 계단 | `facility-3F-stairs-4` | `facility-4F-stairs-4` | 도면 대응 추정 |
| 계단 | `facility-3F-stairs-5` | `facility-4F-stairs-5` | 도면 대응 추정 |
| 계단 | `facility-3F-stairs-7` | `facility-4F-stairs-7` | 도면 대응 추정 |
| 계단 | `facility-2F-stairs-1` | `facility-3F-stairs-4` | 도면 대응 추정 |
| 계단 | `facility-2F-stairs-5` | `facility-3F-stairs-3` | 도면 대응 추정 |
| 계단 | `facility-2F-stairs-7` | `facility-3F-stairs-5` | 도면 대응 추정 |
| 계단 | `facility-2F-stairs-8` | `facility-3F-stairs-7` | 도면 대응 추정 |
| 계단 | `facility-1F-stairs-6` | `facility-2F-stairs-1` | 도면 대응 추정 |
| 계단 | `facility-1F-stairs-7` | `facility-2F-stairs-7` | 도면 대응 추정 |
| 계단 | `facility-1F-stairs-1` | `facility-2F-stairs-8` | 도면 대응 추정 |
| 계단 | `facility-1F-stairs-2` | `facility-2F-stairs-6` | 도면 대응 추정 |
| 계단 | `facility-B1-stairs-4` | `facility-1F-stairs-5` | 도면 대응 추정 |

## 재검산에서 철회한 연결

후면 벽의 단독 계단 기호만으로 같은 계단실이라고 볼 수 없는 연결 2개와, 민속박물관 안내 부근 외곽 계단의 층간 대응 1개를 철회했다. 총 3개 연결을 철회하고 관련 기호 5개를 연결 미확인으로 변경했다. 철회한 원래 대응과 이유는 `transfers.json`의 `rejectedConnections`에 보존한다.

- 운행방향 미확인 에스컬레이터는 기본 길찾기에서 제외한다. 사용자가 포함 옵션을 켜면 도면상 설비군 대응으로만 탐색하고, 경로에 방향 미확인 표시를 남긴다. 이후 일방통행 방향이 등록되면 역방향 탐색을 차단한다.
- 계단에서 승강기로 갈아타는 혼합 경로를 추가했다. 혼합 경로와 같은 출발 시설을 쓰는 단일 종류 경로도 독립적으로 선택할 수 있다.
- 도착 확인은 수동 위치와 층만 갱신한다. 추정 연결 지점으로 GPS 보정 모델을 학습하지 않는다.
- `source.sha256`은 사이트에서 제공하는 PDF 사본의 해시다. 좌표 검산에 쓴 원본 PDF의 추출 출처는 `coordinate-audit.json`에 별도로 있다.

## 연결 미확인

| 기호 | 제외 이유 |
| --- | --- |
| `facility-B1-stairs-1` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-B1-stairs-2` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-B1-escalator-1` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-B1-stairs-3` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-B1-escalator-2` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-B1-elevator-1` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-B1-elevator-2` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-B1-elevator-3` | 정문·와일드투어 게이트 등 출입구와 섞여 있고 반대편 기호 대응이 명확하지 않음. |
| `facility-1F-stairs-3` | 반대층의 동일 시설을 개별적으로 식별하지 못함. 좌표가 가깝거나 같은 종류라는 이유로 연결하지 않음. |
| `facility-1F-elevator-1` | 피크닉 장소/2층 이동 지시선 부근이나 2F의 개별 도착 기호는 식별하지 못함. |
| `facility-1F-stairs-4` | 피크닉 장소/2층 이동 지시선 부근이나 2F의 개별 도착 기호는 식별하지 못함. |
| `facility-1F-elevator-5` | 플라이벤처 전용 지하 공간 접근 시설일 가능성이 있어 일반 B1 연결에서 제외. |
| `facility-1F-elevator-6` | 민속박물관/저자거리 3층 이동 지시선이 있으나 박물관 내부 도착 지점은 가이드 지도 범위에 없음. |
| `facility-1F-elevator-7` | 반대층의 동일 시설을 개별적으로 식별하지 못함. 좌표가 가깝거나 같은 종류라는 이유로 연결하지 않음. |
| `facility-1F-elevator-8` | 반대층의 동일 시설을 개별적으로 식별하지 못함. 좌표가 가깝거나 같은 종류라는 이유로 연결하지 않음. |
| `facility-2F-stairs-2` | 반대층의 동일 시설을 개별적으로 식별하지 못함. 좌표가 가깝거나 같은 종류라는 이유로 연결하지 않음. |
| `facility-2F-stairs-3` | 반대층의 동일 시설을 개별적으로 식별하지 못함. 좌표가 가깝거나 같은 종류라는 이유로 연결하지 않음. |
| `facility-2F-elevator-1` | 반대층의 동일 시설을 개별적으로 식별하지 못함. 좌표가 가깝거나 같은 종류라는 이유로 연결하지 않음. |
| `facility-2F-stairs-9` | 반대층의 동일 시설을 개별적으로 식별하지 못함. 좌표가 가깝거나 같은 종류라는 이유로 연결하지 않음. |
| `facility-MAGIC-escalator-1` | 매직아일랜드 외측 진입부 시설. 실내 2층 연결통로와 동일 시설이라는 근거가 없음. |
| `facility-MAGIC-elevator-1` | 매직아일랜드 외측 진입부 시설. 실내 2층 연결통로와 동일 시설이라는 근거가 없음. |
| `facility-3F-stairs-2` | 후면 벽의 단독 계단 기호만으로 동일 계단실과 양쪽 출입구를 식별할 수 없음. |
| `facility-4F-stairs-2` | 후면 벽의 단독 계단 기호만으로 동일 계단실과 양쪽 출입구를 식별할 수 없음. |
| `facility-3F-stairs-6` | 민속박물관 안내 부근의 외곽 계단과 4F 끝 계단을 같은 계단실로 볼 개별 식별 근거가 부족함. |
| `facility-4F-stairs-6` | 민속박물관 안내 부근의 외곽 계단과 4F 끝 계단을 같은 계단실로 볼 개별 식별 근거가 부족함. |
| `facility-2F-stairs-4` | 후면 벽의 단독 계단 기호만으로 동일 계단실과 양쪽 출입구를 식별할 수 없음. |

실제 출입구·정차층을 검증한 자료가 추가되기 전까지 유지한 30개 연결도 도면 대응 추정이다.
