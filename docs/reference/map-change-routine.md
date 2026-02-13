# Map Change Routine (누락 방지 표준 루틴)

- 기준일: 2026-02-13
- 목적: 맵 확장/변경 시 클라이언트/서버/월드 자산의 정합성 누락을 방지한다.
- 원칙: **Issue First -> 구현 -> 검증 -> 증빙 -> PR**

## 적용 범위

아래 파일군 중 하나라도 변경되면 이 루틴을 필수 적용한다.

1. `world/packs/base/maps/*.json`
2. `packages/server/assets/maps/*.json`
3. `packages/client/public/assets/maps/*.json`
4. `packages/shared/src/world.ts`
5. `packages/server/src/world/WorldPackLoader.ts`
6. `packages/client/src/game/scenes/GameScene.ts`
7. `packages/client/src/ui/Minimap.ts`
8. `tools/kenney-curation.json`
9. `tools/extract_*.py`
10. `world/packs/base/npcs/*.json`

## 필수 절차

1. 이슈 등록/선택
   - 기존 `OCW-CONSIST-*` 이슈를 선택하거나 신규 이슈를 먼저 등록한다.
   - 구현은 이슈가 `In Progress`로 전환된 후 시작한다.

2. 변경 적용
   - 맵 원본은 `world/packs/base/maps/grid_town_outdoor.json`만 수정한다.
   - 타일/NPC/플레이어 에셋은 `tools/kenney-curation.json` 계약을 우선 반영한다.

3. 정합성 검증
   - `pnpm verify:map-change` (권장 단일 명령)
   - 필요 시 상세 확인:
   - `pnpm sync-maps`
   - `node scripts/verify-map-stack-consistency.mjs`
   - `pnpm test`
   - 실패 시 구현보다 먼저 계약 위반 원인을 수정한다.

4. 증빙 작성
   - 변경 요약, 영향 파일, 검증 결과, 잔여 리스크를 기록한다.
   - 증빙 템플릿: [`docs/templates/map-change-evidence.md`](../templates/map-change-evidence.md)

5. PR 제출
   - 이슈 링크, 검증 명령 결과, 영향 범위를 PR 본문에 포함한다.
   - CLI로 PR 생성 시 본문은 반드시 `--body-file` 방식으로 작성한다.
   - PR 본문에 `\\n` 리터럴 문자열이 포함되면 제출 전에 수정한다.
   - PR 체크리스트는 이슈 `OCW-CONSIST-013` 템플릿 기준을 따른다.

## 절대 누락 금지 항목

1. map source/server/client 해시 일치
2. tile size(16) 및 spawn 좌표 계약 검증
3. collision(0/1) 및 blocked 타일 규칙 확인
4. NPC id와 atlas frame 일치
5. README/문서 링크 최신화 여부 확인

## 현재 고도화 이슈

1. PR 체크리스트 템플릿: [#245](https://github.com/Two-Weeks-Team/openClawWorld/issues/245)
2. 맵 영향 CI 게이트: [#246](https://github.com/Two-Weeks-Team/openClawWorld/issues/246)
3. CODEOWNERS 리뷰 강제: [#247](https://github.com/Two-Weeks-Team/openClawWorld/issues/247)
4. 통합 검증 명령: [#248](https://github.com/Two-Weeks-Team/openClawWorld/issues/248)
5. 증빙 템플릿: [#249](https://github.com/Two-Weeks-Team/openClawWorld/issues/249)
6. 루틴 문서/README 진입점: [#250](https://github.com/Two-Weeks-Team/openClawWorld/issues/250)

## 관련 문서

1. `docs/task-issue-registry-2026-02-13.md`
2. `docs/reference/map-sync-process.md`
3. `docs/master-stabilization-plan-2026-02-13.md`
4. `docs/reference/codeowners-enforcement-setup.md`
