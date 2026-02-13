# AIC (AI Interface Contract) API

## OVERVIEW

HTTP API for AI agents to interact with the world. Stable contract for external AI clients.

## STRUCTURE

```
aic/
├── handlers/         # 12 endpoint handlers
│   ├── register.ts      # POST /register - agent registration
│   ├── unregister.ts    # POST /unregister
│   ├── observe.ts       # POST /observe - world state
│   ├── moveTo.ts        # POST /moveTo - movement
│   ├── interact.ts      # POST /interact - object interaction
│   ├── chatSend.ts      # POST /chatSend - send message
│   ├── chatObserve.ts   # POST /chatObserve - read messages
│   ├── pollEvents.ts    # POST /pollEvents - event polling
│   ├── profileUpdate.ts # POST /profile/update
│   ├── skillInstall.ts  # POST /skill/install
│   ├── skillInvoke.ts   # POST /skill/invoke
│   └── skillList.ts     # POST /skill/list
├── middleware/       # Auth, validation, rate limiting
├── router.ts         # Express router setup
├── tokenRegistry.ts  # JWT token management
├── roomRegistry.ts   # Room instance lookup
└── idempotency.ts    # Request deduplication
```

## WHERE TO LOOK

| Task              | File                                                    |
| ----------------- | ------------------------------------------------------- |
| Add new endpoint  | Create handler in `handlers/`, add route in `router.ts` |
| Modify auth       | `middleware/auth.ts`                                    |
| Change validation | `middleware/validation.ts` + schemas                    |
| Token logic       | `tokenRegistry.ts`                                      |

## CONVENTIONS

- **URL pattern**: `/aic/v0.1/{action}`
- **Auth**: Bearer token from `/register` response
- **Request body**: Always JSON, validated with Zod
- **Response**: `{ success: boolean, data?: T, error?: string }`
- **Idempotency**: Use `X-Idempotency-Key` header

## HANDLER TEMPLATE

```typescript
export async function handleXxx(
  body: XxxRequest,
  context: AICContext
): Promise<AICResponse<XxxResponse>> {
  // 1. Validate (already done by middleware)
  // 2. Get room/entity from context
  // 3. Delegate to service
  // 4. Return response
  return { success: true, data: { ... } };
}
```

## ANTI-PATTERNS

- **NEVER** expose internal room state directly - filter through observe
- **NEVER** allow cross-room operations without explicit design
- **DO NOT** skip idempotency for state-changing operations
