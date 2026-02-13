# 오픈클로월드 통합 안정화 마스터 플랜 (2026-02-13)

- 기준 시각: 2026-02-13
- 분석 구간: 2026-02-12 00:00 이후 커밋 + 현재 코드 상태
- 범위: 클라이언트, 서버, 맵, 벽/충돌(block), 미니맵, 컨트롤러, NPC, 상호작용, 타일셋(모양/매핑)

## 1. 목표

1. 어제부터 발생한 문제를 한 번에 정리하고, 재발 방지까지 포함한 실행 계획을 수립한다.
2. 런타임 불안정 요인(입력 충돌, 타일 의미 불일치, 문서/툴 드리프트)을 제거한다.
3. "현재 동작 보존"과 "장기 구조 정리"를 분리해 안전하게 진행한다.

## 2. 현재 기준선 (검증 완료)

1. 테스트: `pnpm test` 통과 (`36 files`, `992 tests`)
2. 맵 동기화: 아래 3개 파일 MD5 동일
   - `world/packs/base/maps/grid_town_outdoor.json`
   - `packages/server/assets/maps/village.json`
   - `packages/client/public/assets/maps/village.json`
3. 16x16 런타임 기준 반영
   - `packages/shared/src/world.ts:20`
   - `world/packs/base/maps/grid_town_outdoor.json:8`
   - `packages/server/src/constants.ts:47`
4. 타일셋 추출 재현성
   - `python3 tools/extract_tileset.py` 재실행 전후 `packages/client/public/assets/maps/tileset.png` 해시 불변

## 3. 이슈 인벤토리 (어제 이후)

| ID | 영역 | 증상 | 근거 | 상태 | 문제해결법 |
|---|---|---|---|---|---|
| I-01 | 서버/AIC | 에이전트가 (0,0)에서 시작해 이동 불가 | 증거: `ocw-skill-system/.../spawn-blocked/evidence.md`, 현재 수정: `packages/server/src/aic/handlers/register.ts:72` | 해결됨 | 스폰을 `GameRoom` 스폰포인트 + `tileSize` 기반 계산으로 통일 |
| I-02 | 서버/AIC | `pollEvents` 400/커서 처리 불안정 | `packages/server/src/aic/handlers/pollEvents.ts:123` | 해결됨 | `sinceCursor` 없을 때 `eventLog.getCurrentCursor()` fallback |
| I-03 | 서버/존 시스템 | gap 영역 이동 시 zone 상태 잔류 | `packages/server/src/zone/ZoneSystem.ts:104`, `packages/server/src/zone/ZoneSystem.ts:149` | 해결됨 | `currentZone === null` 시 `entity.clearZone()` + `entityZones.delete` |
| I-04 | 서버/Observe | mapMetadata 캐시가 룸 간 오염 가능 | `packages/server/src/aic/handlers/observe.ts:24`, `packages/server/src/aic/handlers/observe.ts:35` | 해결됨 | `worldPack name@version` 키로 캐시 분리 |
| I-05 | 클라이언트/미니맵 | 카메라 줌 반영 오류 | `packages/client/src/ui/Minimap.ts:185` | 해결됨 | viewport를 `camera.width/zoom`, `camera.height/zoom`로 계산 |
| I-06 | 클라이언트/미니맵 | `camera.zoom` 방어 부족 | `packages/client/src/ui/Minimap.ts:185` | 해결됨 | `zoom > 0` 가드 적용 |
| I-07 | UI | 핫바/채팅/존 라벨 크기 및 위치 불편 | 관련 커밋: `cffff2e`, `5765baf`, `646859c` | 해결됨 | 상수 추출 + 배치/폰트 조정 |
| I-08 | 맵/타일 | 32->16 마이그레이션 누락 위험 (`/32` 하드코딩 포함) | `scripts/resident-agent-loop.ts:190`, `6f33382` | 해결됨 | `TILE_SIZE` 상수화 + 맵/툴 동시 업데이트 |
| I-09 | 타일셋/런타임 | deep relative import + 무검증 JSON 사용 | `packages/client/src/world/TileInterpreter.ts:9`, `:45` | 해결됨 | `@world` alias + Zod validation 도입 |
| I-10 | 타일셋/맵 의미 | semantic ID와 실제 맵 사용 ID가 불일치 | `world/packs/base/assets/tilesets/village_tileset.json:9`, `packages/client/src/world/TileInterpreter.ts:125` | 미해결(핵심) | "ID 계약 고정 -> Kenney 재배치 -> semantic 정합화 분리" 3단계 수행 |
| I-11 | 컨트롤러/스킬 | 타겟팅 클릭 시 `move_to`가 동시에 발생 가능 | `packages/client/src/game/scenes/GameScene.ts:492`, `packages/client/src/game/scenes/GameScene.ts:207` | 미해결 | 포인터 입력 라우팅을 상태기반으로 단일화 (`targetingMode`면 이동 금지) |
| I-12 | 상호작용 | 클라이언트 로컬(E키) 처리와 서버 `interact` 경로가 분리됨 | 클라: `packages/client/src/game/scenes/GameScene.ts:544`, 서버: `packages/server/src/aic/handlers/interact.ts:87` | 미해결 | 상호작용을 서버 authoritative로 통합하고 affordance를 단일 소스로 정렬 |
| I-13 | NPC | 존 매핑이 하드코딩/중복되어 드리프트 위험 | `packages/server/src/world/WorldPackLoader.ts:385`, NPC json: `world/packs/base/npcs/*.json` | 미해결 | zone source를 NPC 정의/맵 오브젝트 기반으로 단일화하고 하드코딩 제거 |
| I-14 | 맵 툴링 | 파이썬 툴 다수가 64x52/옛 zone 명칭 가정 | `tools/generate_road_map.py:9`, `tools/render_map_with_tiles.py:11`, `tools/visualize_roads.py:11` | 미해결 | 런타임(`MAP_CONFIG`)와 동일한 입력 계약으로 툴 전면 정렬 |
| I-15 | 문서/크레딧 | 32px 설명 및 self-made 표기가 현재 자산 상태와 불일치 | `docs/reference/map-sync-process.md:214`, `world/packs/base/assets/CREDITS.md:7` | 미해결 | 문서/크레딧 업데이트를 릴리즈 게이트에 포함 |

## 4. 영역별 완전 실행 계획

## 4.1 클라이언트

1. 입력 라우팅 통합
   - `pointerdown` 처리기를 하나로 통합하고 모드별 분기:
   - `targetingMode=true`면 `move_to` 금지, 타겟 선택만 수행
   - `targetingMode=false`면 기존 클릭 이동 수행
2. 컨트롤러 안정성 회귀 테스트 추가
   - 시나리오: 채팅 포커스 중 WASD 비활성, 스킬 타겟팅 중 클릭 이동 불가
3. 상호작용 UI를 서버 응답 기반으로 전환
   - E키 입력은 서버 `interact` 요청으로 통일
   - 로컬 메시지 박스는 서버 응답 렌더러로만 사용

완료 기준:
1. 타겟팅 클릭 시 네트워크 `move_to` 호출 0회
2. 상호작용 결과가 클라/서버에서 동일한 메시지와 상태로 표시

## 4.2 서버

1. AIC 경로 안정화 규칙 확정
   - register/pollEvents/observe/interact의 입력 검증/에러 코드 정책을 문서화
2. Zone 전환 회귀 테스트 강화
   - zone->gap->zone 전이 케이스를 API 레벨(contract)로 추가
3. 시설/오브젝트 상호작용 권한 일관성
   - `FacilityService`와 object action registry 검증 규칙 통합

완료 기준:
1. AIC contract 테스트에 gap 전이, interaction-too-far, cursor-none 케이스 포함
2. 오류 코드 체계(`not_found`, `room_not_ready`, `agent_not_in_room` 등) 고정

## 4.3 맵 + 벽(Block) + 충돌

1. 맵 단일 소스 고정
   - `world/packs/base/maps/grid_town_outdoor.json`만 편집 원본으로 사용
2. 벽/충돌 계약 테스트 추가
   - 스폰 타일, 주요 입구 타일, 경계 타일의 pass/block 규칙 스냅샷 테스트
3. 맵 동기화 CI 게이트
   - `sync-maps` 실행 후 world/server/client 맵 해시 일치 검사

완료 기준:
1. 충돌 스냅샷 테스트 통과
2. PR에서 맵 해시 불일치 시 CI 실패

## 4.4 미니맵

1. 줌/뷰포트 산식 테스트 추가
   - `zoom=1`, `zoom!=1`, 극단값에서 viewport rect 유효성 검증
2. 하드코딩 도형 정의를 맵 레이어/타일 정보 기반으로 단계 전환
   - 현재는 빠른 안정화를 위해 유지, 2차에서 자동 렌더링 전환

완료 기준:
1. 카메라 줌 변경 시 미니맵 viewport가 월드 카메라와 오차 1tile 이하

## 4.5 NPC

1. 존 매핑 단일화
   - `getNpcZone()` 하드코딩 제거 (`packages/server/src/world/WorldPackLoader.ts:385`)
   - NPC 정의(`world/packs/base/npcs/*.json`) 또는 맵 오브젝트에서 zone 추출
2. 스프라이트 키 일관성 검증
   - NPC id ↔ atlas frame ↔ npc json sprite 키 교차검사 스크립트 추가

완료 기준:
1. NPC 추가 시 하드코딩 수정 없이 zone/스프라이트 연결 가능
2. 불일치 시 CI에서 즉시 실패

## 4.6 상호작용(Interaction)

1. 클라 로컬 분기 제거
   - `sign/chest/portal/npc` 로컬 처리 대신 서버 처리 우선
2. affordance 단일 정의
   - observe의 affordance와 interact 지원 액션이 항상 일치하도록 공통 소스화
3. 결과 이벤트 표준화
   - `object.state_changed`, `facility.interacted` payload 규격 문서화

완료 기준:
1. 클라이언트와 AIC가 동일한 액션 스펙 사용
2. 로컬 전용 상호작용 분기 0개

## 4.7 타일셋 (모양 포함)

1. ID 계약 고정 (1차)
   - 현재 맵이 쓰는 ID: `1,2,3,4,5,7,9,13`를 우선 계약화
2. Kenney 재배치 (2차)
   - `tools/extract_tileset.py`의 슬롯을 "현재 ID 계약"에 맞춰 재배치
3. 타일 모양 체계 확장 (3차)
   - road/water/wall에 대해 최소 shape 세트 도입:
   - 직선, 코너, T-교차, 십자, 끝단, 외곽/내곽 코너
4. semantic 정합화 (4차, 분리 PR)
   - `village_tileset.json` type과 맵 ground ID 의미를 일치시키는 리인덱싱 또는 타입 재정의

완료 기준:
1. 시각적으로 존/도로/물/벽 구분이 의도대로 표현
2. 타일 의미 문서와 실제 ground ID 분포가 일치

## 5. 단계별 일정 (권장)

1. Phase 0 (당일): 기준선 고정
   - 테스트/해시/문서 기준점 스냅샷
2. Phase 1 (D+1): P0 미해결 처리
   - I-10, I-11, I-12
3. Phase 2 (D+2): 맵/타일셋/툴 정렬
   - I-13, I-14
4. Phase 3 (D+3): 문서/크레딧/게이트
   - I-15 + CI 게이트 적용

## 6. 검증 시나리오 (릴리즈 게이트)

1. 정적 검증
   - `pnpm lint`
   - `pnpm typecheck`
2. 테스트
   - `pnpm test`
3. 맵/타일셋 검증
   - `pnpm sync-maps` 후 맵 3종 해시 동일
   - `python3 tools/extract_tileset.py` 후 타일셋 스냅샷 비교
4. 수동 E2E 체크리스트
   - 클릭 이동, WASD 이동, 채팅 포커스 동작
   - 스킬 타겟팅 클릭 시 이동 미발생
   - E 상호작용 결과가 서버 응답과 일치
   - 미니맵 viewport가 카메라 줌/스크롤과 일치
   - 스폰/입구/벽 충돌 동작 정상

## 7. 리스크와 대응

1. 리스크: 타일 재배치 시 맵 체감이 크게 달라질 수 있음
   - 대응: "ID 계약 고정" 후 시각만 바꾸는 단계와 semantic 단계 분리
2. 리스크: interaction 서버 통합 시 기존 로컬 UX 일시 저하
   - 대응: 서버 응답 기반 UI 어댑터를 먼저 넣고 로컬 분기 제거
3. 리스크: NPC zone 매핑 전환 중 배치 오류
   - 대응: zone/atlas 교차검증 스크립트를 CI에 필수화

## 8. 즉시 착수 우선순위

1. P0: `I-11` 컨트롤러 입력 충돌 수정
2. P0: `I-10` 타일 ID 계약 문서 + 검증 스크립트
3. P1: `I-12` 상호작용 서버 authoritative 통합
4. P1: `I-14` 맵 툴 64x64/16px 기준 정렬

---

참고 분석 문서:
- `docs/tileset-migration-analysis-2026-02-13.md`

