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

Varsentry is a deterministic environment validation CLI. It validates `.env` files against a user-supplied JS schema, then exits with a stable code for CI consumption.

**Data flow**: `bin/varsentry.ts` parses args → loads `.env` via `parser.ts` → loads schema via `require()` → validates via `validator.ts` → serializes output via `serializer.ts` → writes results to stdout and exits.

**Core modules** (`src/`):

- `bin/varsentry.ts` — argument handling (`--file`, `--schema`, `--json`, `--strict`, `--redact`), orchestrates the pipeline, delegates JSON output to `serializer.ts`
- `parser.ts` — parses `.env` files line-by-line into key-value pairs; collects malformed-line errors rather than throwing
- `validator.ts` — applies schema rules: type coercion (`string | number | boolean | url | enum | semver`), required checks, custom validator functions, strict mode (unknown vars = error)
- `serializer.ts` — pure `serialize()` function producing the locked JSON output shape (`version`, `hasErrors`, `parseErrors`, `issues`, `values`); handles `--redact` by omitting `raw` fields and replacing secret-key values with `"[REDACTED]"`
- `errors.ts` — all error codes, messages, and the `VarsentryError` interface; single source of truth for observable error behavior

**Types/Interfaces**: Co-located in each module

**Exit codes**:
| Code | Meaning | Development Status |
| ---- | --------------------------------------- | ---|
| 0 | No errors (warnings allowed) | locked |
| 1 | Parser errors present | locked |
| 2 | CLI misuse | locked |
| 3 | Validation errors present | locked |
| 4 | Schema issues present | locked |
| 5 | License validation failure (future use) | pending |

> Exit codes marked pending may change before v0.1.0. Do not add new exit code logic without checking docs/errors.md first and confirming intent with the user.

**Testing**: Unit tests live alongside source (`*.spec.ts`). Integration tests in `tests/` use `spawnSync` to invoke the compiled CLI and assert exit codes and stdout. Because `pretest` runs `build`, integration tests always test compiled output.

**Schema format**: A `varsentry.config.js` CommonJS file exporting an object where each key maps to `{ type, required, enum, secret, validate }`. See `docs/schema.md` and `varsentry-configs/varsentry.config.js` for examples. The `secret` field marks a value for redaction in JSON output when `--redact` is active; it has no effect on validation.

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

## Commit messages

Before writing any commit message, follow the conventions in `docs/workflows/commit-strategy.md`. Commit type prefixes directly control automated versioning — using the wrong type will either suppress a release that should be cut or trigger one that shouldn't be.

## Conventions

**Naming patterns**

- Files: lowercase, single responsibility (`parser.ts`, `validate.ts`)
- Functions: verb-based (`parseEnv`, `validateEnv`)
- Types: PascalCase (`ParseResult`, `VarsentryError`)
- Constants: UPPER_SNAKE_CASE for error codes

## Do not do this (anti-patterns)

These are explicitly disallowed to prevent complexity and maintain control:

- Do not introduce classes unless absolutely necessary → Functions are sufficient and clearer for this tool
- Do not add frameworks → No benefit for this scope, adds overhead
- Do not introduce dependency injection → Overkill for a CLI utility
- Do not add configuration systems → Keep behavior explicit and CLI-driven
- Do not generalize prematurely → Solve only current, defined problems
- Do not add logging frameworks → Output is controlled via CLI only
- Do not create plugin systems → Out of scope for v0.1
- Do not introduce complex type systems or generics → Maintain readability and approachability
- Do not silently catch errors → All failures must be visible and structured

If a change seems to require any of the above, stop and ask for clarification.
