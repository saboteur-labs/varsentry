# Serializer & JSON Output Format Design

**Date:** 2026-03-22
**Branch:** feat/json-serialization
**Status:** Approved

---

## Overview

Lock down the `--json` output shape and implement `src/serializer.ts` to replace the current ad-hoc `JSON.stringify` calls in `bin/varsentry.ts`. This unblocks stable CI consumption, README documentation, and v0.1.0 release readiness.

---

## Locked JSON Output Shape

```json
{
  "version": "0.1.0",
  "hasErrors": true,
  "parseErrors": [
    {
      "line": 3,
      "code": "PARSE_MISSING_EQUALS",
      "message": "Malformed env line: no equals sign",
      "raw": "BADLINE"
    }
  ],
  "issues": [
    {
      "severity": "error",
      "code": "VALIDATION_MISSING_REQUIRED",
      "variable": "DATABASE_URL",
      "message": "Missing required variable",
      "raw": "bad_value"
    }
  ],
  "values": {
    "PORT": 3000,
    "DEBUG": true
  }
}
```

### Field definitions

| Field | Type | Notes |
|---|---|---|
| `version` | string | Read dynamically from `package.json` |
| `hasErrors` | boolean | `true` if `parseErrors.length > 0 \|\| issues.length > 0` |
| `parseErrors` | array | Always present; empty array if no parse errors |
| `parseErrors[].line` | number | Line number of the malformed line; if absent on the source error (should not occur in practice), emit `0` |
| `parseErrors[].code` | string | Error code from `errors.ts` |
| `parseErrors[].message` | string | Human-readable error message |
| `parseErrors[].raw` | string | Raw line content; **omitted** (not null) when `--redact` is passed |
| `issues` | array | Always present; empty array if no validation errors |
| `issues[].severity` | string | Always `"error"` for now; reserved for future warning support |
| `issues[].code` | string | Error code from `errors.ts` |
| `issues[].variable` | string | Variable name that failed validation; sourced from `VarsentryError.key`. If `key` is absent (should not occur for validation errors in practice), emit an empty string `""` |
| `issues[].message` | string | Human-readable error message |
| `issues[].raw` | string | Raw value that failed validation; **omitted** (not null) when `--redact` is passed |
| `values` | object | Coerced key-value map of variables that passed validation. Variables that fail validation are excluded. `{}` if no schema or all variables fail. |

Parse errors and validation errors are **separate top-level arrays** — parse errors carry line numbers, not variable names, so they are structurally distinct from validation issues.

**Note on mutual exclusivity:** The CLI exits immediately on parse errors without running validation, so in practice `issues` is always empty when `parseErrors` is non-empty. The serializer itself does not enforce this constraint.

---

## Serializer Module (`src/serializer.ts`)

### Types

```ts
import type { VarsentryError } from "./errors";
import type { ValidationResult } from "./validator";

export interface SerializeInput {
  parseErrors: VarsentryError[];       // from parser.ts ParseResult.errors
  validationResult?: ValidationResult; // from validator.ts; absent if no schema provided
}

export interface SerializeOptions {
  redact?: boolean;
}

export interface SerializedParseError {
  line: number;
  code: string;
  message: string;
  raw?: string;  // omitted when redact is true
}

export interface SerializedIssue {
  severity: "error";
  code: string;
  variable: string;
  message: string;
  raw?: string;  // omitted when redact is true
}

export interface SerializedOutput {
  version: string;
  hasErrors: boolean;
  parseErrors: SerializedParseError[];
  issues: SerializedIssue[];
  values: Record<string, unknown>;
}
```

### Function signature

```ts
export function serialize(
  input: SerializeInput,
  options: SerializeOptions = {}
): SerializedOutput
```

### Behavior

1. Reads `version` from `package.json` via `require("../package.json").version`. The compiled serializer lives at `dist/serializer.js`; `../package.json` resolves correctly to the repo root from there. **Requires `"resolveJsonModule": true` in `tsconfig.json`** — this must be added as part of this work.
2. Maps `input.parseErrors` → `parseErrors` array. Each entry uses `VarsentryError.line ?? 0`, `VarsentryError.code`, `VarsentryError.message`, and (if not redacting) `VarsentryError.raw`.
3. Maps `input.validationResult?.errors ?? []` → `issues` array. Each entry uses `severity: "error"`, `VarsentryError.code`, `VarsentryError.key ?? ""`, `VarsentryError.message`, and (if not redacting) `VarsentryError.raw`.
4. Sets `values` to `input.validationResult?.values ?? {}`.
5. Sets `hasErrors = parseErrors.length > 0 || issues.length > 0`.

---

## CLI Changes (`src/bin/varsentry.ts`)

### New flag: `--redact`

Add `redact: boolean` to `CLIOptions`. In `parseArgs`, add an explicit `else if (arg === "--redact")` branch that sets `redact = true` — following the same pattern as `--strict`. This must come before the unknown-flag guard (`else if (arg.startsWith("-"))`) or `--redact` will trigger exit code 2. When passed without `--json`, the flag is accepted and silently ignored — no warning is emitted.

### Collapsed JSON output path

All three current code paths that call `JSON.stringify` are replaced by a single call to `serialize()` followed by `JSON.stringify`. The CLI assembles `SerializeInput` from parse results and (if available) validation results, and passes `{ redact: options.redact }` as options.

Exit code logic is unchanged — determined by error counts, not the serializer.

---

## `tsconfig.json` change

Add `"resolveJsonModule": true` to `compilerOptions`. This is required for TypeScript to type the `require("../package.json")` import in the serializer.

---

## Testing

### `src/serializer.spec.ts` (new unit test file)

- Happy path: no errors, `values` populated, `hasErrors: false`
- Parse errors present: correct shape, `hasErrors: true`, `raw` included by default
- Validation errors present: `severity: "error"`, `variable` populated
- `--redact`: `raw` fields omitted from both `parseErrors` and `issues`
- No schema (`validationResult` absent): `values` is `{}`, `issues` is `[]`
- `version` matches `package.json`

### `tests/cli.integration.test.ts` (additions)

- `--json` produces valid JSON matching the locked shape
- `--json --redact` omits all `raw` fields
- `--json` with no schema: `issues` is `[]`, `values` is `{}`
- `--json` with parse errors: `parseErrors` populated, `issues` is `[]`
- `--redact` without `--json`: exits with code 0 (or appropriate exit code for the run), no warning emitted

---

## Out of Scope

- Warning-level issues (severity field reserved but not populated)
- Machine-readable schema validation errors in JSON output (schema errors still cause early exit with no JSON)
- Streaming or incremental JSON output
