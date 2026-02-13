# 타일셋 32x32->16x16 마이그레이션 및 Kenney 재구성 심층 분석

- 작성일: 2026-02-13
- 기준 브랜치: `main` (HEAD: `befca7e`)
- 분석 범위:
  - 최근 타일셋/맵 관련 커밋 이력
  - 32x32->16x16 전환의 실제 반영 상태
  - Kenney 레퍼런스 기반 타일셋 재구성 현황
  - "현재 타일 매핑과 어울리도록 재구성"을 위한 실행 계획 및 검증

## 1) 결론 요약

1. 32x32->16x16 마이그레이션은 런타임 경로 기준으로 완료 상태다.
2. Kenney 자산 도입과 `tileset.png` 전환도 완료 상태다.
3. 다만 "타일 ID 의미(semantic)"와 "실제 맵에서 사용되는 ID 패턴(visual/material)" 사이에 큰 불일치가 있다.
4. 따라서 다음 작업의 핵심은 "현재 맵 ID 계약을 보존한 상태에서 Kenney 타일을 재배치"하고, 이후 semantic 정합화를 분리 단계로 처리하는 것이다.

## 2) 근거 데이터

### 2.1 최근 관련 커밋 타임라인

1. `2026-02-12 16:18` `b5a5b78`  
   `feat(world): improve zone visual distinction with unique floor tiles and labels`  
   커밋 메시지에서 zone별로 특정 tile ID(예: 5, 7, 9, 13)를 시각적 재질 개념으로 사용.
2. `2026-02-12 18:44` `f3f1753`  
   `feat(world): migrate to 16x16 native tile system`
3. `2026-02-12 22:26` `21a3878`  
   `feat(assets): extract curated Kenney subset (16x16 native)`
4. `2026-02-12 23:10` `3ea5741`  
   `refactor(assets): migrate tileset from SVG to PNG pixel art` (`tools/extract_tileset.py` 도입)
5. `2026-02-13 00:42` `6f33382`  
   `fix: complete 32px to 16px tile size migration`
6. `2026-02-13 01:15` `2eae13c`  
   PR #226 merge (위 6f33382 반영)

### 2.2 16x16 전환 반영 상태

- Unified map가 16px 타일로 고정:
  - `world/packs/base/maps/grid_town_outdoor.json:8`
  - `world/packs/base/maps/grid_town_outdoor.json:9`
  - `world/packs/base/maps/grid_town_outdoor.json:790`
  - `world/packs/base/maps/grid_town_outdoor.json:791`
- 맵 설정 상수도 16px/1024x1024로 일치:
  - `packages/shared/src/world.ts:20`
  - `packages/shared/src/world.ts:21`
  - `packages/shared/src/world.ts:22`
- 서버 기본 타일 크기 16:
  - `packages/server/src/constants.ts:47`
- resident agent 하드코딩 `/32` 제거 후 상수 사용:
  - `scripts/resident-agent-loop.ts:189`
  - `scripts/resident-agent-loop.ts:190`

### 2.3 맵 동기화 상태

`grid_town_outdoor.json`, `packages/server/assets/maps/village.json`, `packages/client/public/assets/maps/village.json`의 MD5가 동일함을 확인했다.

- `e5f31d96e19ef6bdc33fcbd1f657c909` (3개 파일 동일)

즉, 소스/서버/클라이언트 맵 drift는 현재 없다.

### 2.4 Kenney 레퍼런스 연계 상태

- 추출 스크립트가 레퍼런스 경로를 직접 참조:
  - `tools/extract_tileset.py:15`
  - `tools/extract_tileset.py:16`
  - `tools/extract_tileset.py:18`
- 출력 타일셋은 16x16, 8x4 (128x64):
  - `packages/client/public/assets/maps/tileset.json:3`
  - `packages/client/public/assets/maps/tileset.json:4`
  - `packages/client/public/assets/maps/tileset.json:5`
  - `packages/client/public/assets/maps/tileset.json:6`
- 레퍼런스 원본과 복사본 해시 일치 확인:
  - `docs/reference/.../tilemap_packed.png` == `packages/client/public/assets/kenney/tiles/city_tilemap.png`
  - `docs/reference/.../roguelikeIndoor_transparent.png` == `packages/client/public/assets/kenney/interior/interior_tilemap.png`
- `extract_tileset.py` 재실행 시 `tileset.png` MD5 불변:
  - 실행 전후 동일: `0f2b6ef9b791e5579ded605c121e8e21`

즉, 재현 가능한 추출 파이프라인은 확보되어 있다.

## 3) 핵심 이슈: semantic 정의와 실제 맵 사용 ID의 불일치

### 3.1 현재 semantic 정의

`village_tileset.json`은 ID를 semantic type으로 정의한다.

- `3: floor_lobby`
- `4: floor_office`
- `5: floor_meeting`
- `6: floor_lounge`
- `7: floor_arcade`
- `8: floor_plaza`
- `9: floor_lake`
- `13: decoration`

근거: `world/packs/base/assets/tilesets/village_tileset.json:9` 이후.

### 3.2 실제 맵 ground 레이어 사용 ID

ground 레이어 유니크 ID: `1,2,3,4,5,7,9,13`  
카운트: `1:1608, 2:896, 3:56, 4:344, 5:550, 7:198, 9:218, 13:226`

### 3.3 존 경계 기준 분포(정량)

`MAP_CONFIG`/`ZONE_BOUNDS`를 기준으로 zone 내부 ground ID를 집계한 결과:

| Zone | 기대 semantic ID | 일치율 | 최다 사용 ID |
| --- | --- | --- | --- |
| lobby | `floor_lobby(3)` | `0/144 (0.0%)` | `5 (102)` |
| office | `floor_office(4)` | `62/280 (22.1%)` | `9 (218)` |
| central-park | `grass(1)` | `480/480 (100.0%)` | `1 (480)` |
| arcade | `floor_arcade(7)` | `0/288 (0.0%)` | `13 (226)` |
| meeting | `floor_meeting(5)` | `228/288 (79.2%)` | `5 (228)` |
| lounge-cafe | `floor_lounge(6)` | `0/280 (0.0%)` | `5 (220)` |
| plaza | `floor_plaza(8)` | `0/256 (0.0%)` | `7 (198)` |
| lake | `floor_lake(9)` | `0/56 (0.0%)` | `3 (56)` |

### 3.4 원인 해석

`b5a5b78` 커밋 메시지에는 이미 zone별 시각 재질용 타일 ID(wood/sand/carpet 등) 사용이 명시되어 있다.  
즉, 맵은 "semantic floor ID"보다 "시각 재질 ID" 중심으로 운영되어 왔고, 이후 semantic 타입 체계(`floor_lobby` 등)가 도입되며 불일치가 구조적으로 고정된 상태로 보인다.

## 4) 영향도 평가

1. 즉시 장애 위험: 낮음  
   이유: 서버/클라이언트 zone 판정의 핵심 경로는 bounds 기반이며, `TileInterpreter.getZoneAt()`는 현재 호출 지점을 찾지 못했다.
2. 유지보수 위험: 높음  
   이유: ID 의미와 시각 결과가 분리되어 있어, 추후 타일 교체/맵 수정 시 오해로 인한 회귀 가능성이 높다.
3. 문서 신뢰성 위험: 중간  
   이유:
   - `ASSET_MAP.md`에 `TBD` 다수 존재 (`packages/client/public/assets/kenney/ASSET_MAP.md:80` 등)
   - `map-sync-process.md`는 32px 설명 잔존 (`docs/reference/map-sync-process.md:214`)
   - `CREDITS.md`는 self-made procedural 설명 잔존 (`world/packs/base/assets/CREDITS.md:7`)

## 5) 실행 계획 (검증 완료)

### 단계 A: "ID 계약" 동결 및 명문화 (선행 필수)

목표: 현재 맵이 실제로 사용하는 ID를 공식 계약으로 고정.

1. `docs`에 `tile-id-contract` 문서 신설:
   - 필드: `tileId`, `semanticType(현재)`, `runtimeUse(실제)`, `zone`, `KenneySource(col,row)`, `notes`
2. 우선 사용 중인 8개 ID(`1,2,3,4,5,7,9,13`)부터 확정.
3. 미사용 ID(`6,8,10,11,12,14..32`)는 reserved로 선언.

검증 기준:
1. 맵 ground 레이어 유니크 ID가 계약 문서의 key 집합과 일치.
2. PR에서 계약 밖 ID가 추가되면 실패하는 검사(간단 Node 스크립트) 도입.

### 단계 B: Kenney 기반 타일셋 재구성 (현재 매핑 우선)

목표: 맵 ID를 바꾸지 않고, `extract_tileset.py`의 소스 좌표를 재배치해 시각 일관성 개선.

1. `tools/extract_tileset.py`의 `tile_mapping`에서 우선 8개 ID 슬롯 재선정:
   - `1` grass
   - `2` road
   - `3` lake/water
   - `4` wall/border
   - `5` shared indoor floor
   - `7` plaza floor
   - `9` office floor
   - `13` arcade floor
2. 스크립트 실행으로 `packages/client/public/assets/maps/tileset.png` 갱신.
3. 맵 편집 없이 시각만 교정.

검증 기준:
1. `python3 tools/extract_tileset.py` 실행 성공.
2. `village.json`/`grid_town_outdoor.json` 변경 없음 (타일셋 이미지만 변경).
3. 클라이언트 실행 시 zone별 바닥 스타일이 의도와 일치(수동 확인).

### 단계 C: semantic 정합화 (분리 권장)

목표: 장기적으로 `village_tileset.json` semantic 정의와 실제 맵 ID 사용을 수렴.

선택지:
1. 맵 ID를 semantic 기준으로 재인덱싱.
2. semantic 정의를 material 기준으로 재정의.

권장:
1. 단계 B 완료 후 별도 PR에서 수행.
2. 이유: 시각 교정과 semantic 재설계를 분리해야 회귀 추적이 쉽다.

검증 기준:
1. `TileInterpreter`/shared schema/tests 동시 갱신.
2. zone 판정/충돌 관련 회귀 테스트 통과.

## 6) 계획 검증 결과

아래 항목을 사전 검증 완료:

1. 소스 자산 접근성: 통과  
   - `docs/reference/Kenney Game Assets All-in-1 3.3.0/...` 파일 존재 확인.
2. 추출 재현성: 통과  
   - `extract_tileset.py` 실행 전후 `tileset.png` MD5 동일.
3. 맵 동기화 일관성: 통과  
   - world/server/client `village` JSON MD5 동일.
4. 즉시 런타임 의존성 리스크: 허용 가능  
   - `getZoneAt()` 미사용, zone 시스템은 bounds 기반.

즉, "단계 A -> 단계 B" 순으로 바로 착수 가능하다.

## 7) 즉시 실행 순서 (추천)

1. 단계 A 문서 계약 먼저 확정.
2. 단계 B에서 `extract_tileset.py` ID 8개 슬롯 재매핑 적용.
3. 시각 점검 후 단계 C를 별도 PR로 분리 진행.

