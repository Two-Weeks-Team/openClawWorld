# OpenClawWorld AIC v0.1 — 정합성 체크 매트릭스

**생성일**: 2026-02-21

4-way 정합성 비교: OpenAPI 스펙 ↔ Zod 스키마 ↔ TypeScript 타입 ↔ 핸들러 구현

---

## 범례

| 기호 | 의미             |
| ---- | ---------------- |
| ✅   | 일치             |
| ⚠️   | 부분 불일치      |
| ❌   | 불일치 또는 누락 |
| N/A  | 해당 없음        |

---

## REST 엔드포인트 정합성 매트릭스

### POST /register

| 항목                   | OpenAPI  | Zod Schema | TS Type  | Handler   | 상태        |
| ---------------------- | -------- | ---------- | -------- | --------- | ----------- |
| Request: agentId       | required | ❌ 없음    | ❌ 없음  | ❌ 미사용 | **D-01 ❌** |
| Request: name          | required | required   | required | ✅ 사용   | ✅          |
| Request: roomId        | required | required   | required | ✅ 사용   | ✅          |
| Response: token        | required | ❌ 없음    | ❌ 없음  | ❌ 없음   | **D-02 ❌** |
| Response: entityId     | required | ❌ 없음    | ❌ 없음  | ❌ 없음   | **D-02 ❌** |
| Response: expiresAt    | required | ❌ 없음    | ❌ 없음  | ❌ 없음   | **D-02 ❌** |
| Response: agentId      | ❌ 없음  | required   | required | ✅ 있음   | **D-02 ❌** |
| Response: roomId       | ❌ 없음  | required   | required | ✅ 있음   | **D-02 ❌** |
| Response: sessionToken | ❌ 없음  | required   | required | ✅ 있음   | **D-02 ❌** |

### POST /reconnect

| 항목                   | OpenAPI | Zod Schema | TS Type  | Handler | 상태       |
| ---------------------- | ------- | ---------- | -------- | ------- | ---------- |
| 경로 문서화            | ❌ 없음 | ✅ 있음    | ✅ 있음  | ✅ 있음 | **NEW ❌** |
| Request: agentId       | N/A     | required   | required | ✅ 사용 | —          |
| Request: sessionToken  | N/A     | required   | required | ✅ 사용 | —          |
| Response: agentId      | N/A     | required   | required | ✅ 있음 | —          |
| Response: roomId       | N/A     | required   | required | ✅ 있음 | —          |
| Response: sessionToken | N/A     | required   | required | ✅ 있음 | —          |
| Response: pos          | N/A     | required   | required | ✅ 있음 | —          |
| Response: tile         | N/A     | optional   | optional | ✅ 있음 | —          |

### POST /heartbeat

| 항목                            | OpenAPI | Zod Schema | TS Type  | Handler    | 상태       |
| ------------------------------- | ------- | ---------- | -------- | ---------- | ---------- |
| 경로 문서화                     | ❌ 없음 | ✅ 있음    | ✅ 있음  | ✅ 있음    | **NEW ❌** |
| Request: agentId                | N/A     | required   | required | ✅ 사용    | —          |
| Request: roomId                 | N/A     | required   | required | — (미사용) | ⚠️         |
| Response: serverTsMs            | N/A     | N/A        | N/A      | ✅ 있음    | —          |
| Response: timeoutMs             | N/A     | N/A        | N/A      | ✅ 있음    | —          |
| Response: recommendedIntervalMs | N/A     | N/A        | N/A      | ✅ 있음    | —          |

### POST /observe

| 항목                        | OpenAPI       | Zod Schema       | TS Type  | Handler   | 상태        |
| --------------------------- | ------------- | ---------------- | -------- | --------- | ----------- |
| Request: detail             | required enum | optional enum    | optional | ❌ 미사용 | **D-14 ⚠️** |
| Request: includeGrid        | ❌ 없음       | optional boolean | optional | ✅ 사용   | **D-14 ❌** |
| Response: facilities        | ❌ 없음       | required array   | required | ✅ 있음   | **D-15 ❌** |
| Response: mapMetadata       | ❌ 없음       | optional         | optional | ✅ 있음   | **D-15 ❌** |
| Response: nearby (npc kind) | ❌ 없음       | ✅ (npc 포함)    | ✅ (npc) | ✅ 반환   | **D-04 ❌** |

### POST /moveTo

| 항목                      | OpenAPI | Zod Schema | TS Type | Handler | 상태        |
| ------------------------- | ------- | ---------- | ------- | ------- | ----------- |
| Response result: accepted | ✅      | ✅         | ✅      | ✅      | ✅          |
| Response result: rejected | ✅      | ✅         | ✅      | ✅      | ✅          |
| Response result: no_op    | ✅      | ✅         | ✅      | ✅      | ✅          |
| Response result: no_path  | ❌ 없음 | ✅         | ✅      | ✅ 반환 | **D-05 ❌** |

### POST /chatSend

| 항목                               | OpenAPI | Zod Schema    | TS Type       | Handler | 상태        |
| ---------------------------------- | ------- | ------------- | ------------- | ------- | ----------- |
| Request: channel (proximity)       | ✅      | ✅            | ✅            | ✅      | ✅          |
| Request: channel (global)          | ✅      | ✅            | ✅            | ✅      | ✅          |
| Request: channel (team/meeting/dm) | ❌ 없음 | ✅ (Extended) | ✅ (Extended) | ❌ 거부 | 의도적 제한 |
| Response 전체                      | ✅      | ✅            | ✅            | ✅      | ✅          |

### POST /pollEvents

| 항목                    | OpenAPI  | Zod Schema | TS Type  | Handler       | 상태        |
| ----------------------- | -------- | ---------- | -------- | ------------- | ----------- |
| Request: sinceCursor    | required | optional   | optional | optional 처리 | **D-06 ❌** |
| Response: cursorExpired | ❌ 없음  | required   | required | ✅ 있음       | **D-07 ❌** |
| Response: events        | ✅       | ✅         | ✅       | ✅            | ✅          |
| Response: nextCursor    | ✅       | ✅         | ✅       | ✅            | ✅          |

### POST /profile/update

| 항목                   | OpenAPI  | Zod Schema      | TS Type  | Handler   | 상태        |
| ---------------------- | -------- | --------------- | -------- | --------- | ----------- |
| Request: name          | optional | ❌ 없음         | ❌ 없음  | ❌ 미사용 | **D-09 ❌** |
| Request: meta          | optional | ❌ 없음         | ❌ 없음  | ❌ 미사용 | **D-09 ❌** |
| Request: status        | ❌ 없음  | optional        | optional | ✅ 사용   | **D-09 ❌** |
| Request: statusMessage | ❌ 없음  | optional        | optional | ✅ 사용   | **D-09 ❌** |
| Request: title         | ❌ 없음  | optional        | optional | ✅ 사용   | **D-09 ❌** |
| Request: department    | ❌ 없음  | optional        | optional | ✅ 사용   | **D-09 ❌** |
| Response: updated      | required | ❌ 없음         | ❌ 없음  | ❌ 없음   | **D-10 ❌** |
| Response: applied      | ❌ 없음  | required        | required | ✅ 있음   | **D-10 ❌** |
| Response: profile      | ❌ 없음  | required object | required | ✅ 있음   | **D-10 ❌** |

---

## Enum 정합성 매트릭스

### EntityKind

| 값      | OpenAPI | Zod    | TS Type | 실제 사용 |
| ------- | ------- | ------ | ------- | --------- |
| human   | ✅      | ✅     | ✅      | ✅        |
| agent   | ✅      | ✅     | ✅      | ✅        |
| object  | ✅      | ✅     | ✅      | ✅        |
| **npc** | **❌**  | **✅** | **✅**  | **✅**    |

**결론**: OpenAPI에서 `npc` 누락 (D-04)

### ChatChannel (AIC API)

| 값        | OpenAPI | Zod (ChatChannel) | Zod (ExtendedChatChannel) | chatSend.ts 허용 |
| --------- | ------- | ----------------- | ------------------------- | ---------------- |
| proximity | ✅      | ✅                | ✅                        | ✅               |
| global    | ✅      | ✅                | ✅                        | ✅               |
| team      | ❌      | ❌                | ✅                        | ❌               |
| meeting   | ❌      | ❌                | ✅                        | ❌               |
| dm        | ❌      | ❌                | ✅                        | ❌               |

**결론**: team/meeting/dm은 AIC chatSend에서 의도적으로 제한. 단, ExtendedChatChannel이 스키마에 존재하므로 향후 노출 여부 명확화 필요 (D-03)

### MoveToResult

| 값          | OpenAPI | Zod    | TS Type | moveTo.ts 반환 |
| ----------- | ------- | ------ | ------- | -------------- |
| accepted    | ✅      | ✅     | ✅      | ✅             |
| rejected    | ✅      | ✅     | ✅      | ✅             |
| no_op       | ✅      | ✅     | ✅      | ✅             |
| **no_path** | **❌**  | **✅** | **✅**  | **✅**         |

**결론**: OpenAPI에서 `no_path` 누락 (D-05)

### EventType

| 값                      | OpenAPI | Zod (EventTypeSchema) | TS (EventType) | 실제 사용 |
| ----------------------- | ------- | --------------------- | -------------- | --------- |
| presence.join           | ✅      | ✅                    | ✅             | ✅        |
| presence.leave          | ✅      | ✅                    | ✅             | ✅        |
| proximity.enter         | ✅      | ✅                    | ✅             | ✅        |
| proximity.exit          | ✅      | ✅                    | ✅             | ✅        |
| zone.enter              | ✅      | ✅                    | ✅             | ✅        |
| zone.exit               | ✅      | ✅                    | ✅             | ✅        |
| chat.message            | ✅      | ✅                    | ✅             | ✅        |
| object.state_changed    | ✅      | ✅                    | ✅             | ✅        |
| **profile.updated**     | **❌**  | **✅**                | **✅**         | **✅**    |
| **npc.state_change**    | **❌**  | **✅**                | **✅**         | ✅        |
| **facility.interacted** | **❌**  | **✅**                | **✅**         | ✅        |
| **emote.triggered**     | **❌**  | **✅**                | **✅**         | **✅**    |
| meeting.\* (12개)       | **❌**  | **❌**                | **✅**         | **✅**    |

**결론**: OpenAPI에서 4개 EventType 누락, MeetingEventType 12개 완전 미문서화 (D-08)

---

## 불일치 이슈 전체 요약표

| ID   | 위치                                            | 심각도 | 종류                    | 자동 수정 가능                |
| ---- | ----------------------------------------------- | ------ | ----------------------- | ----------------------------- |
| D-01 | openapi.ts RegisterRequest.agentId              | 높음   | OpenAPI 스키마 오류     | ✅ openapi.ts 수정만으로 해결 |
| D-02 | openapi.ts RegisterResponseData                 | 높음   | OpenAPI 스키마 오류     | ✅ openapi.ts 수정만으로 해결 |
| D-03 | openapi.ts ChatChannel vs ExtendedChatChannel   | 중간   | 설계 결정 필요          | —                             |
| D-04 | openapi.ts EntityKind (npc 누락)                | 중간   | OpenAPI enum 오류       | ✅ openapi.ts 수정만으로 해결 |
| D-05 | openapi.ts MoveToResult (no_path 누락)          | 중간   | OpenAPI enum 오류       | ✅ openapi.ts 수정만으로 해결 |
| D-06 | openapi.ts PollEventsRequest.sinceCursor        | 중간   | OpenAPI required 오류   | ✅ openapi.ts 수정만으로 해결 |
| D-07 | openapi.ts PollEventsResponseData.cursorExpired | 중간   | OpenAPI 필드 누락       | ✅ openapi.ts 수정만으로 해결 |
| D-08 | openapi.ts EventType enum                       | 높음   | OpenAPI enum 불완전     | ✅ openapi.ts 수정만으로 해결 |
| D-09 | openapi.ts ProfileUpdateRequest                 | 높음   | OpenAPI 스키마 오류     | ✅ openapi.ts 수정만으로 해결 |
| D-10 | openapi.ts ProfileUpdateResponseData            | 높음   | OpenAPI 스키마 오류     | ✅ openapi.ts 수정만으로 해결 |
| D-11 | packages/plugin/src/client.ts                   | 높음   | SDK 구현 부재           | ❌ SDK 코드 작성 필요         |
| D-12 | tests/contracts/                                | 낮음   | 테스트 커버리지 부족    | ❌ 테스트 코드 작성 필요      |
| D-13 | tests/contracts/skill.test.ts                   | 중간   | 테스트 비표준 필드 사용 | ✅ 테스트 수정만으로 해결     |
| D-14 | openapi.ts ObserveRequest                       | 높음   | OpenAPI 스키마 불일치   | ✅ openapi.ts 수정만으로 해결 |
| D-15 | openapi.ts ObserveResponseData                  | 높음   | OpenAPI 스키마 불일치   | ✅ openapi.ts 수정만으로 해결 |
| NEW  | openapi.ts paths (6개 엔드포인트 누락)          | 높음   | OpenAPI 경로 미문서화   | ✅ openapi.ts 수정만으로 해결 |

**P1 (openapi.ts 수정만으로 해결 가능)**: 14개
**P2 (SDK 코드 작성 필요)**: 1개 (D-11, 10개 메서드)
**P3 (테스트 코드 작성 필요)**: 2개 (D-12, D-13)
