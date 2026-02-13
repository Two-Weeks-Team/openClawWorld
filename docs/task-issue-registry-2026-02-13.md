# 맵/프레임워크 정합성 이슈 레지스트리 (Issue-First)

- 등록일: 2026-02-13
- 원칙: **모든 작업은 태스크로 분리하고, 구현 전에 이슈를 먼저 등록한다.**
- 상태 정의:
  - `Registered`: 이슈만 등록됨 (구현 시작 전)
  - `In Progress`: 구현 진행 중
  - `Done`: 코드/문서/검증 완료

## TODO (Task Split)

1. 맵-클라이언트-서버 정합성 자동 검증 체계 고도화
2. 월드 로더 기본값(64x64/16) 및 폴백 정합성 수정
3. Kenney 타일/NPC/플레이어 추출 파이프라인 단일 매니페스트화
4. 충돌(block)·스폰·입구·오브젝트 계약 검증 강화
5. 미니맵 렌더링의 맵 기반 정합성 확보
6. 컨트롤러 입력(이동/스킬 타게팅) 충돌 제거
7. NPC 존 매핑 하드코딩 제거 및 단일 소스화
8. 상호작용 로직 서버 authoritative 일원화
9. 맵/타일셋/문서 드리프트 제거 (16x16 기준)
10. README 및 기준 문서 연결
11. 맵 변경 PR 체크리스트 템플릿 도입
12. 맵 영향 파일 변경 감지 CI 게이트 도입
13. 맵 스택 파일 CODEOWNERS 리뷰 강제
14. 맵 변경 통합 검증 명령 추가
15. 맵 변경 증빙 리포트 템플릿 도입
16. 반복 운영 루틴 문서화 및 README 진입점 강화

## 이슈 등록 목록 (우선 등록 전용)

| Local Issue ID | Task | 범위 | 우선순위 | 산출물 | 상태 |
|---|---|---|---|---|---|
| `OCW-CONSIST-001` | 맵 스택 검증 게이트 | `scripts/verify-map-stack-consistency.mjs`, `package.json`, CI 후속 | P0 | 검증 스크립트/실행 명령/실패 조건 표준화 | Registered |
| `OCW-CONSIST-002` | 월드 로더 폴백 정합성 | `packages/server/src/world/WorldPackLoader.ts` | P0 | `height` 폴백 52 제거(64 기준) + 회귀 검증 | Registered |
| `OCW-CONSIST-003` | Kenney 타일셋 매니페스트 계약 | `tools/kenney-curation.json`, `tools/extract_tileset.py` | P0 | 타일 슬롯-시맨틱-출처 고정 | Registered |
| `OCW-CONSIST-004` | NPC 추출 매니페스트화 | `tools/extract_npc_sprites.py`, `tools/kenney-curation.json` | P0 | NPC atlas 생성이 매니페스트 단일 소스 사용 | Registered |
| `OCW-CONSIST-005` | 플레이어 추출 매니페스트화 | `tools/extract_player_sprites.py`, `tools/kenney-curation.json` | P1 | player atlas 생성이 매니페스트 단일 소스 사용 | Registered |
| `OCW-CONSIST-006` | 충돌/벽/스폰 계약 검증 | 맵 레이어 + shared/server spawn 계약 | P0 | block/collision/spawn 체크 자동화 | Registered |
| `OCW-CONSIST-007` | 미니맵 정합성 보장 | `packages/client/src/ui/Minimap.ts` | P1 | 하드코딩 지형 의존 축소, 맵 데이터 기반 렌더 단계화 | Registered |
| `OCW-CONSIST-008` | 컨트롤러 입력 충돌 제거 | `packages/client/src/game/scenes/GameScene.ts` | P0 | 타게팅 중 이동 클릭 차단(단일 라우팅) | Registered |
| `OCW-CONSIST-009` | NPC 존 매핑 단일 소스화 | `WorldPackLoader`, `world/packs/base/npcs/*.json`, map objects | P0 | 하드코딩 zone map 제거 | Registered |
| `OCW-CONSIST-010` | 상호작용 authoritative 통합 | client interaction + server interact handlers | P0 | 로컬 분기 축소/서버 응답 기반 일원화 | Registered |
| `OCW-CONSIST-011` | 문서 16x16 동기화 | `docs/reference/map-sync-process.md` 외 | P1 | 32px/64x52 잔재 제거 및 최신 계약 반영 | Registered |
| `OCW-CONSIST-012` | README 연결 | `README.md` | P1 | 정합성 보장 시스템 문서 링크 명시 | Registered |
| `OCW-CONSIST-013` | 맵 변경 PR 체크리스트 템플릿 | `.github/pull_request_template.md` | P0 | 맵 영향 변경 시 필수 검토 항목 누락 방지 | Registered |
| `OCW-CONSIST-014` | 맵 영향 파일 변경 감지 CI 게이트 | `.github/workflows/ci.yml` | P0 | map-impact 변경 시 정합성 검증 강제 | Registered |
| `OCW-CONSIST-015` | CODEOWNERS 리뷰 강제(맵 스택) | `.github/CODEOWNERS` | P1 | map/shared/client/server 핵심 파일 필수 리뷰어 지정 | Registered |
| `OCW-CONSIST-016` | 맵 변경 통합 검증 명령 | `package.json`, `scripts/*` | P1 | `pnpm verify:map-change` 단일 명령 제공 | Registered |
| `OCW-CONSIST-017` | 맵 변경 증빙 리포트 템플릿 | `docs/templates/map-change-evidence.md` | P1 | 변경 전후 증빙 표준화(해시/스크린샷/리스크) | Registered |
| `OCW-CONSIST-018` | 반복 운영 루틴 문서화 + README 강화 | `docs/reference/map-change-routine.md`, `README.md` | P1 | 반복 작업 표준 루틴 문서화/진입 링크 제공 | Registered |

## 실행 순서 (이슈 기준)

1. P0 이슈부터 순차 처리: `001 -> 002 -> 003 -> 004 -> 006 -> 008 -> 009 -> 010`
2. 고도화 P0 처리: `013 -> 014`
3. 이후 P1 처리: `005 -> 007 -> 011 -> 012 -> 015 -> 016 -> 017 -> 018`
4. 각 이슈는 `Registered -> In Progress -> Done` 상태 전환 후 다음 이슈로 이동

## GitHub Issue Links

1. `OCW-CONSIST-013`: https://github.com/Two-Weeks-Team/openClawWorld/issues/245
2. `OCW-CONSIST-014`: https://github.com/Two-Weeks-Team/openClawWorld/issues/246
3. `OCW-CONSIST-015`: https://github.com/Two-Weeks-Team/openClawWorld/issues/247
4. `OCW-CONSIST-016`: https://github.com/Two-Weeks-Team/openClawWorld/issues/248
5. `OCW-CONSIST-017`: https://github.com/Two-Weeks-Team/openClawWorld/issues/249
6. `OCW-CONSIST-018`: https://github.com/Two-Weeks-Team/openClawWorld/issues/250

## 검증 규칙

- 각 이슈 완료 조건에 최소 1개 자동 검증 명령을 포함한다.
- 맵/타일/스폰 관련 이슈는 `scripts/verify-map-stack-consistency.mjs` 결과를 첨부한다.
- 문서 이슈는 수정 파일 경로와 기준일(2026-02-13)을 명시한다.
