# Secret Field & Redaction Design

**Date:** 2026-03-22
**Branch:** feat/json-serialization
**Status:** Approved

---

## Overview

Add a `secret?: boolean` field to the `VarRule` schema interface. When `--redact` is passed, any variable marked `secret: true` has its value replaced with `"[REDACTED]"` in the JSON `values` map. `--redact` also suppresses raw values from human-readable (non-JSON) error output. Together, `--redact` becomes a unified "safe for logging" mode.

---

## Schema Change (`src/validator.ts`)

Add `secret?: boolean` to `VarRule`:

```ts
export interface VarRule {
    type?: VarType;
    required?: boolean;
    enum?: string[];
    secret?: boolean;
    validate?: (value: string) => boolean;
}
```

`secret` has no effect on validation. It does not influence type coercion, required checks, enum validation, or custom validators. It is a pure metadata annotation for downstream consumers.

Example schema:

```js
module.exports = {
    DATABASE_URL: { type: 'url', required: true, secret: true },
    PORT:         { type: 'number', required: true },
}
```

---

## Data Flow

### Extracting secret keys (CLI)

After loading the schema, the CLI derives the set of secret key names:

```ts
const secretKeys = Object.keys(schema).filter((k) => schema[k].secret);
```

This list is passed into `SerializeInput`.

### SerializeInput change (`src/serializer.ts`)

Add `secretKeys` as an optional field:

```ts
export interface SerializeInput {
    parseErrors: VarsentryError[];
    validationResult?: ValidationResult;
    secretKeys?: string[];
}
```

### Serializer behavior

When `redact: true` and `secretKeys` is non-empty, the serializer replaces each secret key's value in the output `values` map with `"[REDACTED]"`:

```ts
if (redact) {
    for (const key of secretKeys ?? []) {
        if (key in values) {
            values[key] = "[REDACTED]";
        }
    }
}
```

Non-secret keys are always passed through verbatim. If `redact` is false, all values appear in full regardless of `secret` annotation.

### Example JSON output with `--redact`

```json
{
  "version": "0.1.0",
  "hasErrors": false,
  "parseErrors": [],
  "issues": [],
  "values": {
    "DATABASE_URL": "[REDACTED]",
    "PORT": 3000
  }
}
```

---

## Human-Readable Output Change (`src/bin/varsentry.ts`)

When `--redact` is active, the raw value line in `formatErrors` is suppressed. This applies to all variables, not just secret ones — any raw error value is hidden in safe mode.

`formatErrors` gains a `redact` parameter:

```ts
function formatErrors(
    errors: { key?: string; line?: number; message: string; raw?: string }[],
    redact: boolean,
) {
    for (const err of errors) {
        if ("line" in err && err.line !== undefined) {
            console.error(`Line ${err.line}: ${err.message}`);
            if (err.raw && !redact) console.error(`  ${err.raw}`);
        } else if ("key" in err && err.key !== undefined) {
            console.error(`${err.key}: ${err.message}`);
        }
        console.error();
    }
}
```

Both `formatErrors` call sites in `main()` pass `options.redact`.

---

## CLI Wiring (`src/bin/varsentry.ts`)

- Extract `secretKeys` after `loadSchema()`:
  ```ts
  const secretKeys = Object.keys(schema).filter((k) => schema[k].secret);
  ```
- Pass `secretKeys` into all `serialize()` calls that have a schema:
  ```ts
  serialize({ parseErrors: [], validationResult, secretKeys }, { redact: options.redact })
  ```
- Pass `options.redact` to both `formatErrors` call sites.

---

## Testing

### `src/validator.spec.ts`

- `secret: true` on a `VarRule` is accepted without error and does not affect validation output (values still coerced normally, errors still produced for invalid values)

### `src/serializer.spec.ts`

- `redact: true` + `secretKeys: ["DATABASE_URL"]`: `values.DATABASE_URL === "[REDACTED]"`, non-secret keys intact
- `redact: false` + `secretKeys` present: all values appear in full
- `secretKeys` absent or empty + `redact: true`: no value redaction (existing behavior preserved)

### `tests/cli.integration.test.ts`

- `--json --redact` with a `secret: true` schema var: that var's value is `"[REDACTED]"` in `values`; non-secret vars appear in full
- `--redact` (no `--json`) with a validation error: raw value suppressed from stderr
- Without `--redact` with a validation error: raw value appears in stderr

---

## Out of Scope

- Redacting secret key names (only values are redacted)
- Redacting secrets from human-readable success output (there is none — success path only prints "validation passed")
- Any effect of `secret` on validation behavior
