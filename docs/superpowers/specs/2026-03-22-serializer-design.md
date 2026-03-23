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
| `parseErrors[].line` | number | Line number of the malformed line |
| `parseErrors[].code` | string | Error code from `errors.ts` |
| `parseErrors[].message` | string | Human-readable error message |
| `parseErrors[].raw` | string | Raw line content; **omitted** when `--redact` is passed |
| `issues` | array | Always present; empty array if no validation errors |
| `issues[].severity` | string | Always `"error"` for now; reserved for future warning support |
| `issues[].code` | string | Error code from `errors.ts` |
| `issues[].variable` | string | Variable name that failed validation |
| `issues[].message` | string | Human-readable error message |
| `issues[].raw` | string | Raw value that failed validation; **omitted** when `--redact` is passed |
| `values` | object | Coerced key-value map from successful validation; `{}` if no schema |

Parse errors and validation errors are **separate top-level arrays** — parse errors carry line numbers, not variable names, so they are structurally distinct from validation issues.

---

## Serializer Module (`src/serializer.ts`)

### Interface

```ts
import type { ParseError } from "./parser";
import type { ValidationResult } from "./validator";

export interface SerializeInput {
  parseErrors: ParseError[];
  validationResult?: ValidationResult;
}

export interface SerializeOptions {
  redact?: boolean;
}

export interface SerializedOutput {
  version: string;
  hasErrors: boolean;
  parseErrors: SerializedParseError[];
  issues: SerializedIssue[];
  values: Record<string, unknown>;
}

export interface SerializedParseError {
  line: number;
  code: string;
  message: string;
  raw?: string;
}

export interface SerializedIssue {
  severity: "error";
  code: string;
  variable: string;
  message: string;
  raw?: string;
}

export function serialize(
  input: SerializeInput,
  options: SerializeOptions = {}
): SerializedOutput
```

### Behavior

1. Reads `version` via `require("../../package.json").version`
2. Maps `input.parseErrors` → `parseErrors` array; omits `raw` if `options.redact`
3. Maps `input.validationResult.errors` → `issues` array with `severity: "error"`; omits `raw` if `options.redact`
4. Passes `input.validationResult.values` through as `values`; defaults to `{}` if no `validationResult`
5. Sets `hasErrors = parseErrors.length > 0 || issues.length > 0`

---

## CLI Changes (`src/bin/varsentry.ts`)

### New flag: `--redact`

Added to `CLIOptions` and `parseArgs`. Silently ignored when `--json` is not passed.

### Collapsed JSON output path

All three current code paths that call `JSON.stringify` are replaced by a single call to `serialize()` followed by `JSON.stringify`. The CLI assembles `SerializeInput` and passes `{ redact: options.redact }`.

Exit code logic is unchanged — determined by error counts, not the serializer.

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

---

## Out of Scope

- Warning-level issues (severity field reserved but not populated)
- Machine-readable schema validation errors in JSON output (schema errors still cause early exit with no JSON)
- Streaming or incremental JSON output
