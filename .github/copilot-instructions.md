# Varsentry

## Commands

```bash
pnpm build          # Compile TypeScript → dist/
pnpm test           # Build then run all tests (unit + integration)
pnpm test:watch     # Run Jest in watch mode (skips pretest build)
```

Run a single test file:

```bash
pnpm exec jest src/parser.spec.ts
pnpm exec jest tests/cli.integration.test.ts
```

## Tech stack

- **Language/runtime**
    - TypeScript (strict mode)
    - Node.js (target: 18+)
- **Frameworks**
    - None by design
    - The project intentionally avoids frameworks to maintain simplicity and full control over behavior
- **Key libraries**
    - Jest → unit and integration testing
    - Node.js standard library (fs, path, child_process) → file handling and CLI execution
    - No runtime dependencies preferred (keep install surface minimal)

## Architecture

**Core modules** (`src/`):

- `bin/varsentry.ts` — argument handling (`--file`, `--schema`, `--json`, `--strict`), orchestrates the pipeline, delegates output formatting to `serializer.ts` (currently handles output directly, will delegate to serializer.ts)
- `parser.ts` — parses `.env` files line-by-line into key-value pairs; collects malformed-line errors rather than throwing
- `validator.ts` — applies schema rules: type coercion (`string | number | boolean`), required checks, custom validator functions, strict mode (unknown vars = error)
- `serializer.ts` - serializes validator output to JSON (**Not yet implemented**, see docs/json-output.md for guidance)
- `errors.ts` — all error codes, messages, and the `VarsentryError` interface; single source of truth for observable error behavior

**Types/Interfaces**: Co-located in each module

**Exit codes**:
| Code | Meaning | Development Status |
| ---- | --------------------------------------- | ---|
| 0 | No errors (warnings allowed) | locked |
| 1 | Parser errors present | locked |
| 2 | Validation errors present | locked |
| 3 | Schema issues present | pending |
| 4 | CLI misuse | pending |
| 5 | License validation failure (future use) | pending |

> Exit Codes marked pending may change before v0.1.0. Do not add new exit code logic without checking docs/errors.md first and confirming intent with the user.

**Testing**: Unit tests live alongside source (`*.spec.ts`). Integration tests in `tests/` use `spawnSync` to invoke the compiled CLI and assert exit codes and stdout. Because `pretest` runs `build`, integration tests always test compiled output.

**Schema format**: A `varsentry.config.js` CommonJS file exporting an object where each key maps to `{ type, required, validate }`. See `docs/schema.md` and `varsentry-configs/varsentry.config.js` for examples.

**External dependencies / APIs**

- No external APIs
- No network calls
- Fully local execution

**State management**

- No shared mutable state
- Functions are pure where possible
- Data passed explicitly between modules

**Async handling**

- Use async/await where needed (primarily in CLI for file IO)
- Avoid unnecessary async
- No background tasks or concurrency complexity

## Conventions

**Naming patterns**

- Files: lowercase, single responsibility (`parser.ts`, `validate.ts`)
- Functions: verb-based (`parseEnv`, `validateEnv`)
- Types: PascalCase (`ParseResult`, `VarsentryError`)
- Constants: UPPER_SNAKE_CASE for error codes

## Do not do this (anti-patterns)

These are explicitly disallowed to prevent complexity and maintain control:

- Do not introduce classes unless absolutely necessary
- Do not add frameworks
- Do not introduce dependency injection
- Do not add configuration systems
- Do not generalize prematurely
- Do not add logging frameworks
- Do not create plugin systems
- Do not introduce complex type systems or generics
- Do not silently catch errors

If a change seems to require any of the above, stop and ask for clarification.
