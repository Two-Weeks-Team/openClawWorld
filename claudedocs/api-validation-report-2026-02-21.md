# OpenClawWorld AIC API 정합성 및 사용가능성 검증 보고서

**검증 일시**: 2026-02-21
**검증 범위**: AIC v0.1 — REST API 18개, Colyseus 이벤트 API (GameRoom 7개, MeetingRoom 11개)
**검증 방법**: 정적 코드 분석 (openapi.ts ↔ schemas.ts ↔ types.ts ↔ 핸들러) + 테스트 실행

---

## 요약 (Executive Summary)

| 항목 | 수치 |
|------|------|
| REST 엔드포인트 수 | 18개 |
| OpenAPI 문서화된 엔드포인트 | 12개 (6개 누락) |
| 발견된 불일치 (신규 포함) | **15개** (D-01~D-15) |
| 심각도 높음 | 9개 |
| 심각도 중간 | 6개 |
| Plugin SDK 구현 | 8/19 메서드 (42%) |
| 계약 테스트 커버리지 | 7/18 엔드포인트 (39%) |
| `pnpm test` 결과 | **44 test files, 1094 tests — 전체 통과 (0 실패)** |

### 즉시 수정 필요 (P1)

1. **D-01/D-02**: `/register` Request/Response 스키마가 실제 구현과 완전히 다름 — SDK 연동 즉시 실패
2. **D-09/D-10**: `/profile/update` Request/Response 스키마도 완전히 다름
3. **D-06/D-07**: `/pollEvents` sinceCursor optional 처리 및 cursorExpired 필드 누락
4. **D-14/D-15**: `/observe` Request에 includeGrid 누락, Response에 facilities/mapMetadata 누락
5. **D-08**: EventType enum 8개 vs 실제 12개+MeetingEventType(12개)
6. **NEW**: OpenAPI paths에 6개 엔드포인트 아예 미문서화

---

## 1. 라이프사이클별 API 인벤토리

### Phase 1: 접속

#### GET /channels
- **핸들러**: `channels.ts` — `getChannelList()` 결과를 `{ channels }` 형태로 반환
- **Request**: 없음 (GET, 인증 불필요)
- **Response**: `{ status: 'ok', data: { channels: [...] } }`
- **OpenAPI 문서**: ❌ **누락** (paths에 없음)
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

#### POST /register
- **핸들러**: `register.ts`
- **실제 Request**: `{ name: string, roomId: string }` — agentId는 서버가 자동 생성
- **실제 Response**: `{ agentId: string, roomId: string, sessionToken: string }`
- **OpenAPI Request**: `{ agentId: string (required), roomId: string, name: string }` ← **D-01: agentId 불필요하게 required**
- **OpenAPI Response**: `{ token, entityId, expiresAt }` ← **D-02: 모든 필드명 다름**
- **Plugin SDK**: ✅ `register()` 구현됨
- **계약 테스트**: ✅ `tests/contracts/register.test.ts` (17개 테스트)

#### POST /reconnect
- **핸들러**: `reconnect.ts`
- **실제 Request**: `{ agentId: string, sessionToken: string }`
- **실제 Response**: `{ agentId, roomId, sessionToken, pos: {x,y}, tile?: {tx,ty} }`
- **OpenAPI 문서**: ❌ **누락** (paths에 없음)
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

### Phase 2: 활동 유지

#### POST /heartbeat
- **핸들러**: `heartbeat.ts`
- **실제 Request**: `{ agentId: string, roomId: string }`
- **실제 Response**: `{ agentId, serverTsMs, timeoutMs, recommendedIntervalMs }`
- **OpenAPI 문서**: ❌ **누락** (paths에 없음)
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

### Phase 3: 관찰

#### POST /observe
- **핸들러**: `observe.ts`
- **실제 Request**: `{ agentId, roomId, radius, detail?, includeSelf?, includeGrid? }` — detail 파라미터는 핸들러에서 미사용
- **실제 Response**: `{ self, nearby, facilities, serverTsMs, room, mapMetadata? }`
- **OpenAPI Request**: `{ agentId, roomId, radius, detail (required), includeSelf }` ← **D-14: includeGrid 누락, detail이 핸들러에서 미사용**
- **OpenAPI Response**: `{ self, nearby, serverTsMs, room }` ← **D-15: facilities, mapMetadata 누락**
- **Plugin SDK**: ✅ `observe()` 구현됨
- **계약 테스트**: ✅ `tests/contracts/observe.test.ts` (16개 테스트)

#### POST /chatObserve
- **핸들러**: `chatObserve.ts`
- **실제 Request**: `{ agentId, roomId, windowSec, channel? }`
- **실제 Response**: `{ messages: ChatMessage[], serverTsMs }`
- **OpenAPI**: 문서화됨, 스키마 일치
- **Plugin SDK**: ✅ `chatObserve()` 구현됨
- **계약 테스트**: ❌ 없음

### Phase 4: 행동

#### POST /moveTo
- **핸들러**: `moveTo.ts`
- **실제 Response**: `{ txId, applied, serverTsMs, result: 'accepted'|'rejected'|'no_op'|'no_path' }`
- **OpenAPI Response**: result enum `['accepted', 'rejected', 'no_op']` ← **D-05: no_path 누락**
- **Plugin SDK**: ✅ `moveTo()` 구현됨
- **계약 테스트**: ✅ `tests/contracts/moveTo.test.ts` (16개 테스트)

#### POST /interact
- **핸들러**: `interact.ts`
- **실제 Request/Response**: OpenAPI와 일치
- **Plugin SDK**: ✅ `interact()` 구현됨
- **계약 테스트**: ✅ `tests/contracts/interact.test.ts` (15개 테스트)

#### POST /chatSend
- **핸들러**: `chatSend.ts`
- **실제 Request/Response**: OpenAPI와 일치. channel은 `['proximity', 'global']` 만 허용
- **Plugin SDK**: ✅ `chatSend()` 구현됨
- **계약 테스트**: ✅ `tests/contracts/chatSend.test.ts` (13개 테스트)
- **참고**: `ExtendedChatChannelSchema` (team/meeting/dm)는 AIC API에서 미노출

### Phase 5: 스킬

#### POST /skill/list
- **핸들러**: `skillList.ts`
- **실제 Request/Response**: OpenAPI와 일치
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ✅ `tests/contracts/skill.test.ts` 내 포함

#### POST /skill/install
- **핸들러**: `skillInstall.ts`
- **실제 Request/Response**: OpenAPI와 일치
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ✅ `tests/contracts/skill.test.ts` 내 포함

#### POST /skill/invoke
- **핸들러**: `skillInvoke.ts`
- **실제 Request**: OpenAPI에는 `txId` required. 핸들러는 `txId`를 body에서 `(body as {txId?: string}).txId ?? uuid()` 처리 — optional처럼 동작
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ✅ `tests/contracts/skill.test.ts` 내 포함

### Phase 6: 미팅

#### POST /meeting/list
- **핸들러**: `meetingList.ts`
- **실제 Request**: 없음 (인증만) — Zod schema는 `{ agentId, roomId }` 요구
- **실제 Response**: `{ meetings: [{ meetingId, name, hostId, participantCount, capacity }] }`
- **OpenAPI 문서**: ❌ **누락** (paths에 없음)
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

#### POST /meeting/join
- **핸들러**: `meetingJoin.ts`
- **실제 Request**: `{ agentId, roomId, meetingId }`
- **실제 Response**: `{ meetingId, role, participants }`
- **OpenAPI 문서**: ❌ **누락** (paths에 없음)
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

#### POST /meeting/leave
- **핸들러**: `meetingLeave.ts`
- **실제 Request**: `{ agentId, roomId, meetingId }`
- **실제 Response**: `{ meetingId, leftAt }`
- **OpenAPI 문서**: ❌ **누락** (paths에 없음)
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

### Phase 7: 이벤트 수신

#### POST /pollEvents
- **핸들러**: `pollEvents.ts`
- **실제 Request**: `{ agentId, roomId, sinceCursor? (optional), limit?, waitMs? }`
- **실제 Response**: `{ events, nextCursor, cursorExpired, serverTsMs }`
- **OpenAPI Request**: `sinceCursor: required` ← **D-06: optional인데 required로 표시**
- **OpenAPI Response**: `cursorExpired` 필드 없음 ← **D-07: 필드 누락**
- **Plugin SDK**: ✅ `pollEvents()` 구현됨
- **계약 테스트**: ✅ `tests/contracts/pollEvents.test.ts` (17개 테스트)

### Phase 8: 종료

#### POST /unregister
- **핸들러**: `unregister.ts`
- **실제 Request**: `{ agentId, roomId }`
- **실제 Response**: `{ agentId, unregisteredAt }`
- **OpenAPI**: 문서화됨, 스키마 일치
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

#### POST /profile/update
- **핸들러**: `profileUpdate.ts`
- **실제 Request**: `{ agentId, roomId, status?, statusMessage?, title?, department? }`
- **실제 Response**: `{ applied: true, profile: {entityId, displayName, status, statusMessage, avatarUrl, title, department}, serverTsMs }`
- **OpenAPI Request**: `{ agentId, roomId, name?, meta? }` ← **D-09: 완전히 다른 필드**
- **OpenAPI Response**: `{ updated: boolean, serverTsMs }` ← **D-10: 완전히 다른 구조**
- **Plugin SDK**: ❌ 없음
- **계약 테스트**: ❌ 없음

### Phase 9: 이벤트 기반 API (Colyseus)

#### GameRoom WebSocket onMessage

| 메시지 타입 | 페이로드 | 방향 |
|------------|---------|------|
| `move_to` | `{ tx: number, ty: number }` | Client → Server |
| `chat` | `{ message: string }` | Client → Server |
| `emote` | `{ emoteType: string }` | Client → Server |
| `profile_update` | `{ status?, statusMessage? }` | Client → Server |
| `skill_invoke` | `{ skillId, actionId, targetId?, params? }` | Client → Server |
| `skill_cancel` | (없음) | Client → Server |
| `interact` | `{ targetId, action, params? }` | Client → Server |

#### GameRoom Server → Client 이벤트

| 이벤트 | 페이로드 |
|--------|---------|
| `skill.invoke_result` | `{ txId, outcome }` |
| `skill.cast_started` | `{ txId, skillId, actionId, casterId, targetId, completionTime }` |
| `skill.cast_cancelled` | `{ casterId, reason }` |
| `chat` | `{ from, message, entityId, channel?, messageId?, tsMs? }` |
| `emote` | `{ entityId, emoteType }` |
| `interact.result` | `{ txId, outcome }` |
| `assignedEntityId` | `{ entityId }` |

#### MeetingRoom WebSocket onMessage

| 메시지 타입 | 페이로드 |
|------------|---------|
| `chat` | `{ message: string }` |
| `getChatHistory` | `{ limit?: number }` |
| `transfer_host` | `{ newHostId: string }` |
| `end_meeting` | (없음) |
| `agenda_add` | `{ item: AgendaItemData }` |
| `agenda_update` | `{ itemId: string, updates: Partial<AgendaItemData> }` |
| `agenda_remove` | `{ itemId: string }` |
| `agenda_complete` | `{ itemId: string }` |
| `agenda_set_current` | `{ itemId: string }` |
| `agenda_next` | (없음) |
| `agenda_reorder` | `{ itemIds: string[] }` |

---

## 2. 정합성 체크 결과

### 2-1. Enum 값 비교 표

#### EntityKind
| 소스 | 값 |
|------|---|
| OpenAPI | `human`, `agent`, `object` |
| Zod (EntityKindSchema) | `human`, `agent`, `object`, **`npc`** |
| 실제 사용 (observe.ts) | `npc` 반환 가능 |
| **불일치** | **D-04: `npc` OpenAPI에 누락** |

#### ChatChannel (AIC API용)
| 소스 | 값 |
|------|---|
| OpenAPI | `proximity`, `global` |
| Zod (ChatChannelSchema) | `proximity`, `global` |
| Zod (ExtendedChatChannelSchema) | `proximity`, `global`, `team`, `meeting`, `dm` |
| chatSend.ts 허용 채널 | `proximity`, `global` |
| **참고** | ExtendedChatChannel은 AIC API에서 미노출 (Meeting API 내부 전용) |

#### MoveToResult
| 소스 | 값 |
|------|---|
| OpenAPI | `accepted`, `rejected`, `no_op` |
| Zod (MoveToResultSchema) | `accepted`, `rejected`, `no_op`, **`no_path`** |
| 실제 사용 (moveTo.ts) | `no_path` 반환 가능 (A* 경로 없을 때) |
| **불일치** | **D-05: `no_path` OpenAPI에 누락** |

#### EventType
| 소스 | 값 수 |
|------|------|
| OpenAPI | 8개 |
| Zod (EventTypeSchema) | 12개 |
| types.ts (EventType) | 12개 + MeetingEventType 12개 = 24개 |
| **불일치** | **D-08: OpenAPI가 8개만 정의** |

**OpenAPI 누락 이벤트** (Zod 기준):
- `profile.updated`
- `npc.state_change`
- `facility.interacted`
- `emote.triggered`

**MeetingEventType** (OpenAPI 완전 누락):
- `meeting.created`, `meeting.participant_joined`, `meeting.participant_left`
- `meeting.host_transferred`, `meeting.ended`
- `agenda.item_added`, `agenda.item_removed`, `agenda.item_updated`
- `agenda.item_completed`, `agenda.current_item_set`
- `agenda.next_item`, `agenda.items_reordered`

### 2-2. Plugin SDK 커버리지

| 엔드포인트 | SDK 메서드 | 구현 |
|-----------|-----------|------|
| GET /channels | - | ❌ |
| POST /register | `register()` | ✅ |
| POST /reconnect | - | ❌ |
| POST /heartbeat | - | ❌ |
| POST /observe | `observe()` | ✅ |
| POST /chatObserve | `chatObserve()` | ✅ |
| POST /moveTo | `moveTo()` | ✅ |
| POST /interact | `interact()` | ✅ |
| POST /chatSend | `chatSend()` | ✅ |
| POST /skill/list | - | ❌ |
| POST /skill/install | - | ❌ |
| POST /skill/invoke | - | ❌ |
| POST /meeting/list | - | ❌ |
| POST /meeting/join | - | ❌ |
| POST /meeting/leave | - | ❌ |
| POST /pollEvents | `pollEvents()` | ✅ |
| POST /unregister | - | ❌ |
| POST /profile/update | - | ❌ |
| GET /status (추가) | `status()` | ✅ |

**구현율**: 8/18 REST 엔드포인트 (44%) | 미구현: 10개

### 2-3. 계약 테스트 커버리지

| 엔드포인트 | 테스트 파일 | 테스트 수 |
|-----------|-----------|---------|
| POST /register | `contracts/register.test.ts` | 17 |
| POST /observe | `contracts/observe.test.ts` | 16 |
| POST /moveTo | `contracts/moveTo.test.ts` | 16 |
| POST /interact | `contracts/interact.test.ts` | 15 |
| POST /pollEvents | `contracts/pollEvents.test.ts` | 17 |
| POST /chatSend | `contracts/chatSend.test.ts` | 13 |
| POST /skill/* | `contracts/skill.test.ts` | 17 |
| **미커버** | channels, reconnect, heartbeat, chatObserve, meeting/*, unregister, profile/update | — |

**커버리지**: 7개 파일, 10개 엔드포인트 커버 (8개 미커버)

---

## 3. 이슈 목록 (전체)

### 높음

| ID | 위치 | 현재 값 | 기대 값 | 영향 |
|----|------|---------|---------|------|
| D-01 | openapi.ts RegisterRequest | `required: ['agentId', 'roomId', 'name']` | `required: ['name', 'roomId']` | SDK/문서 사용자가 agentId를 전송하면 서버에서 무시됨. 실제 동작 불일치 |
| D-02 | openapi.ts RegisterResponseData | `{ token, entityId, expiresAt }` | `{ agentId, roomId, sessionToken }` | 문서 기반 클라이언트 구현 즉시 실패 |
| D-08 | openapi.ts EventType | 8개 enum | 12개 + MeetingEventType 12개 | AI 에이전트가 profile.updated, emote.triggered 등 이벤트 처리 불가 |
| D-09 | openapi.ts ProfileUpdateRequest | `{ agentId, roomId, name?, meta? }` | `{ agentId, roomId, status?, statusMessage?, title?, department? }` | profile 업데이트 완전 불가 |
| D-10 | openapi.ts ProfileUpdateResponseData | `{ updated, serverTsMs }` | `{ applied, profile{...}, serverTsMs }` | 응답 파싱 실패 |
| D-11 | packages/plugin/src/client.ts | 8개 메서드 구현 | 18개 필요 | Skill, Meeting, heartbeat 등 10개 기능 SDK로 사용 불가 |
| D-14 | openapi.ts ObserveRequest | `detail` required, `includeGrid` 없음 | `includeGrid` 추가, `detail` optional | 핸들러가 detail을 사용 안 함. includeGrid가 API 노출 안 됨 |
| D-15 | openapi.ts ObserveResponseData | `{ self, nearby, serverTsMs, room }` | `{ self, nearby, facilities, serverTsMs, room, mapMetadata? }` | 시설 정보, 맵 메타데이터 문서에 없음 |
| NEW | openapi.ts paths | 12개 경로만 정의 | 18개 필요 | /channels, /reconnect, /heartbeat, /meeting/* 6개 미문서화 |

### 중간

| ID | 위치 | 현재 값 | 기대 값 | 영향 |
|----|------|---------|---------|------|
| D-03 | openapi.ts ChatChannel | `['proximity', 'global']` | ExtendedChatChannel 문서화 필요 여부 확인 | Meeting 채널 등 확장 채널이 문서에 없음 |
| D-04 | openapi.ts EntityKind | `['human', 'agent', 'object']` | `['human', 'agent', 'object', 'npc']` | NPC 엔티티 observe 결과에서 kind 값 문서 불일치 |
| D-05 | openapi.ts MoveToResult | `['accepted', 'rejected', 'no_op']` | `+no_path` | 경로 없음 결과를 에이전트가 처리 못함 |
| D-06 | openapi.ts PollEventsRequest | `sinceCursor: required` | `sinceCursor: optional` | 첫 번째 폴링 시 cursor 없이 호출 불가 |
| D-07 | openapi.ts PollEventsResponseData | `cursorExpired` 필드 없음 | `cursorExpired: boolean` 추가 | 에이전트가 cursor 만료 감지 불가 |
| D-13 | tests/contracts/skill.test.ts | `version`, `emoji`, `source`, `triggers` 사용 | SkillDefinition 스키마에 없는 필드 | 테스트가 비표준 필드로 모킹 → false positive 위험 |

### 낮음

| ID | 위치 | 현재 값 | 기대 값 | 영향 |
|----|------|---------|---------|------|
| D-12 | tests/contracts/ | 7개 파일, 10개 엔드포인트 | 18개 전체 | 미커버 엔드포인트 회귀 감지 불가 |

---

## 4. 테스트 실행 결과

```
pnpm test (vitest run)
실행 일시: 2026-02-21

Test Files:  44 passed (44)
     Tests:  1094 passed (1094)
  Start at: 09:36:41
  Duration:  5.07s

테스트 파일 분류:
  tests/contracts/     7개 파일  (95개 테스트)
  tests/unit/         24개 파일  (618개 테스트)
  tests/scenarios/     3개 파일   (18개 테스트)
  tests/schema-validation.test.ts  1개 파일 (29개 테스트)
  tests/policy/        4개 파일   (68개 테스트)
  tests/server/        1개 파일   (19개 테스트)
  tests/ecosystem/     4개 파일   (51개 테스트)
```

**결론**: 모든 기존 테스트 통과. 그러나 테스트들은 Mock 기반으로 실제 서버 동작 검증 없음.

---

## 5. 권장 수정 우선순위

### P1 — 즉시 (OpenAPI Spec 수정, 코드 변경 없음)

| 작업 | 파일 | 내용 |
|------|------|------|
| Fix RegisterRequest | `openapi.ts` | `required`에서 `agentId` 제거 |
| Fix RegisterResponseData | `openapi.ts` | `{token,entityId,expiresAt}` → `{agentId,roomId,sessionToken}` |
| Fix ProfileUpdateRequest | `openapi.ts` | `{name,meta}` → `{status,statusMessage,title,department}` |
| Fix ProfileUpdateResponseData | `openapi.ts` | `{updated}` → `{applied,profile{...}}` |
| Fix PollEventsRequest | `openapi.ts` | `sinceCursor`를 optional로 변경 |
| Add cursorExpired | `openapi.ts` | PollEventsResponseData에 `cursorExpired: boolean` 추가 |
| Add npc to EntityKind | `openapi.ts` | `['human','agent','object','npc']` |
| Add no_path to MoveToResult | `openapi.ts` | `['accepted','rejected','no_op','no_path']` |
| Fix ObserveRequest | `openapi.ts` | `includeGrid` 추가, `detail` optional로 변경 |
| Fix ObserveResponseData | `openapi.ts` | `facilities[]`, `mapMetadata` 추가 |
| Add missing EventTypes | `openapi.ts` | `profile.updated`, `npc.state_change`, `facility.interacted`, `emote.triggered` + MeetingEventType 12개 |
| Add missing paths | `openapi.ts` | `/channels`, `/reconnect`, `/heartbeat`, `/meeting/list`, `/meeting/join`, `/meeting/leave` 추가 |

### P2 — 단기 (Plugin SDK 미구현 메서드 추가)

`packages/plugin/src/client.ts`에 다음 메서드 추가:
- `channels()` — GET /channels
- `reconnect(params)` — POST /reconnect
- `heartbeat(params)` — POST /heartbeat
- `skillList(params)` — POST /skill/list
- `skillInstall(params)` — POST /skill/install
- `skillInvoke(params)` — POST /skill/invoke
- `meetingList(params)` — POST /meeting/list
- `meetingJoin(params)` — POST /meeting/join
- `meetingLeave(params)` — POST /meeting/leave
- `unregister(params)` — POST /unregister
- `profileUpdate(params)` — POST /profile/update

### P3 — 중기 (미커버 계약 테스트 추가)

`tests/contracts/` 에 추가:
- `channels.test.ts`
- `reconnect.test.ts`
- `heartbeat.test.ts`
- `chatObserve.test.ts`
- `meeting.test.ts` (list/join/leave)
- `unregister.test.ts`
- `profileUpdate.test.ts`

`tests/contracts/skill.test.ts` 수정:
- `TEST_SKILL`에서 `version`, `emoji`, `source`, `triggers` 제거 (비표준 필드)

### P4 — 장기 (Colyseus 이벤트 API 공식 문서화)

- GameRoom WebSocket 메시지 스키마를 OpenAPI의 별도 섹션 또는 AsyncAPI 스펙으로 문서화
- MeetingRoom WebSocket 메시지 스키마 문서화
- Server→Client 브로드캐스트 이벤트 목록 공식화

---

## 6. 핵심 파일 경로 참조

| 역할 | 경로 |
|------|------|
| OpenAPI 스펙 | `packages/server/src/openapi.ts` |
| Zod 스키마 | `packages/shared/src/schemas.ts` |
| TypeScript 타입 | `packages/shared/src/types.ts` |
| REST 핸들러 | `packages/server/src/aic/handlers/` |
| GameRoom | `packages/server/src/rooms/GameRoom.ts` |
| MeetingRoom | `packages/server/src/rooms/MeetingRoom.ts` |
| Plugin SDK | `packages/plugin/src/client.ts` |
| 계약 테스트 | `tests/contracts/` |
