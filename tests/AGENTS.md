# TESTS

## OVERVIEW

Comprehensive test suite: unit tests (Vitest), integration tests, contract tests, and E2E (Playwright).

## STRUCTURE

```
tests/
├── unit/             # 21 unit test files
├── integration/      # Server integration tests
├── contracts/        # API contract tests (AIC)
├── scenarios/        # Multi-step scenario tests
├── policy/           # Permission/access policy tests
├── e2e/              # Playwright browser tests
├── helpers/          # Test utilities
├── fixtures/         # Test data
└── scripts/          # Test setup scripts
```

## WHERE TO LOOK

| Test Type   | Location         | When to Use               |
| ----------- | ---------------- | ------------------------- |
| Unit        | `unit/*.test.ts` | Single module isolation   |
| Integration | `integration/`   | Multi-service interaction |
| Contract    | `contracts/`     | AIC API validation        |
| Policy      | `policy/`        | Permission rules          |
| E2E         | `e2e/`           | Full browser flow         |

## CONVENTIONS

- **Naming**: `{feature}.test.ts`
- **Framework**: Vitest with coverage
- **Mocking**: Vitest mocks, no external mock libs
- **Fixtures**: JSON in `fixtures/`
- **Assertions**: Vitest `expect()`, strict equality

## KEY TEST FILES

| File                              | Tests                        |
| --------------------------------- | ---------------------------- |
| `zone-system-64x64.test.ts`       | Zone boundaries, transitions |
| `meeting-room.test.ts`            | Meeting facility logic       |
| `schema-validation.test.ts`       | Zod schema validation        |
| `chat-mismatch-detection.test.ts` | Chat sync verification       |

## COMMANDS

```bash
pnpm test              # Run all unit tests
pnpm test:watch        # Watch mode
pnpm test:e2e          # Playwright E2E
pnpm test -- unit/zone # Run specific test file
```

## ANTI-PATTERNS

- **NEVER** skip tests to make CI pass
- **NEVER** use `test.skip` without TODO comment
- Tests must be deterministic - no random without seed
