# Secret Field & Redaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `secret?: boolean` to the `VarRule` schema interface so that values marked secret are replaced with `"[REDACTED]"` in JSON output and their raw values are suppressed in human-readable output when `--redact` is active.

**Architecture:** `secret` is a pure metadata annotation on `VarRule` — it has no effect on validation. The CLI extracts secret key names from the schema after loading it and passes them into `SerializeInput`. The serializer shallow-copies `values` then replaces secret key values with `"[REDACTED]"` when `redact: true`. `formatErrors` gains a `redact` parameter to suppress raw lines in human-readable output. The existing `--redact` warning (stderr when `--redact` used without `--json`) is removed because `--redact` now has an unconditional effect on human-readable output too.

**Tech Stack:** TypeScript (strict), Node.js 18+, Jest + ts-jest.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/validator.ts` | Add `secret?: boolean` to `VarRule` |
| Modify | `src/validator.spec.ts` | Add test confirming `secret` doesn't affect validation |
| Modify | `src/serializer.ts` | Add `secretKeys?: string[]` to `SerializeInput`; shallow-copy `values`; add redaction loop |
| Modify | `src/serializer.spec.ts` | Add 4 unit tests for `secretKeys` behavior |
| Modify | `src/bin/varsentry.ts` | Remove `--redact` warning; add `redact` param to `formatErrors`; extract `secretKeys`; pass both to relevant call sites |
| Modify | `tests/cli.integration.test.ts` | Update existing `--redact without --json` test; add 3 new integration tests |

---

## Task 1: Add `secret` to `VarRule`

**Files:**
- Modify: `src/validator.ts`
- Modify: `src/validator.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to the end of `src/validator.spec.ts`, inside `describe("validate", () => {`:

```ts
describe("secret field", () => {
    it("accepts secret: true without affecting validation output", () => {
        const schema: Schema = {
            API_KEY: { type: "string", required: true, secret: true },
        };

        const result = validate({ API_KEY: "hunter2" }, schema);

        expect(result.errors).toHaveLength(0);
        expect(result.values).toEqual({ API_KEY: "hunter2" });
    });

    it("still errors normally on invalid values for secret vars", () => {
        const schema: Schema = {
            PORT: { type: "number", secret: true },
        };

        const result = validate({ PORT: "not-a-number" }, schema);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe("VALIDATION_INVALID_NUMBER_VALUE");
    });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
pnpm exec jest src/validator.spec.ts --testNamePattern="secret field"
```

Expected: FAIL — `Object literal may only specify known properties, and 'secret' does not exist in type 'VarRule'`

- [ ] **Step 3: Add `secret` to `VarRule` in `src/validator.ts`**

Find the `VarRule` interface (currently lines 8–13). Add `secret?: boolean` after `enum`:

```ts
export interface VarRule {
    type?: VarType;
    required?: boolean;
    enum?: string[];
    secret?: boolean;
    validate?: (value: string) => boolean;
}
```

- [ ] **Step 4: Run the tests — confirm they pass**

```bash
pnpm exec jest src/validator.spec.ts
```

Expected: all tests PASS (including existing tests — the new field must not break anything).

- [ ] **Step 5: Commit**

```bash
git add src/validator.ts src/validator.spec.ts
git commit -m "feat: add secret field to VarRule schema interface"
```

---

## Task 2: Implement secret redaction in serializer

**Files:**
- Modify: `src/serializer.ts`
- Modify: `src/serializer.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add to the end of the `describe("serialize", () => {` block in `src/serializer.spec.ts`:

```ts
describe("secretKeys redaction", () => {
    it("replaces secret key values with [REDACTED] when redact is true", () => {
        const input: SerializeInput = {
            parseErrors: [],
            validationResult: {
                values: { DATABASE_URL: "postgres://secret", PORT: 3000 },
                errors: [],
            },
            secretKeys: ["DATABASE_URL"],
        };

        const result = serialize(input, { redact: true });

        expect(result.values["DATABASE_URL"]).toBe("[REDACTED]");
        expect(result.values["PORT"]).toBe(3000);
    });

    it("does not redact secret key values when redact is false", () => {
        const input: SerializeInput = {
            parseErrors: [],
            validationResult: {
                values: { DATABASE_URL: "postgres://secret" },
                errors: [],
            },
            secretKeys: ["DATABASE_URL"],
        };

        const result = serialize(input, { redact: false });

        expect(result.values["DATABASE_URL"]).toBe("postgres://secret");
    });

    it("does not mutate the original validationResult values", () => {
        const originalValues = { DATABASE_URL: "postgres://secret" };
        const input: SerializeInput = {
            parseErrors: [],
            validationResult: { values: originalValues, errors: [] },
            secretKeys: ["DATABASE_URL"],
        };

        serialize(input, { redact: true });

        expect(originalValues["DATABASE_URL"]).toBe("postgres://secret");
    });

    it("silently skips secret keys absent from values (e.g. failed validation)", () => {
        const input: SerializeInput = {
            parseErrors: [],
            validationResult: { values: {}, errors: [] },
            secretKeys: ["MISSING_KEY"],
        };

        expect(() => serialize(input, { redact: true })).not.toThrow();
        expect(serialize(input, { redact: true }).values).toEqual({});
    });
});
```

- [ ] **Step 2: Run the tests — confirm they fail**

```bash
pnpm exec jest src/serializer.spec.ts --testNamePattern="secretKeys redaction"
```

Expected: FAIL — `secretKeys` does not exist on `SerializeInput`

- [ ] **Step 3: Update `src/serializer.ts`**

Make three changes:

**Change 1** — Add `secretKeys` to `SerializeInput` (after `validationResult?`):

```ts
export interface SerializeInput {
    parseErrors: VarsentryError[];
    validationResult?: ValidationResult;
    secretKeys?: string[];
}
```

**Change 2** — Replace line 71 (`const values = ...`) with a shallow copy plus redaction loop:

```ts
    const values: Record<string, unknown> = {
        ...(input.validationResult?.values ?? {}),
    };

    if (redact) {
        for (const key of input.secretKeys ?? []) {
            if (key in values) {
                values[key] = "[REDACTED]";
            }
        }
    }
```

The full `serialize` function body after this change should look like:

```ts
export function serialize(
    input: SerializeInput,
    options: SerializeOptions = {},
): SerializedOutput {
    const { redact = false } = options;

    const parseErrors: SerializedParseError[] = input.parseErrors.map((e) => {
        const entry: SerializedParseError = {
            line: e.line ?? 0,
            code: e.code,
            message: e.message,
        };
        if (!redact && e.raw !== undefined) {
            entry.raw = e.raw;
        }
        return entry;
    });

    const validationErrors = input.validationResult?.errors ?? [];
    const issues: SerializedIssue[] = validationErrors.map((e) => {
        const entry: SerializedIssue = {
            severity: "error",
            code: e.code,
            variable: e.key ?? "",
            message: e.message,
        };
        if (!redact && e.raw !== undefined) {
            entry.raw = e.raw;
        }
        return entry;
    });

    const values: Record<string, unknown> = {
        ...(input.validationResult?.values ?? {}),
    };

    if (redact) {
        for (const key of input.secretKeys ?? []) {
            if (key in values) {
                values[key] = "[REDACTED]";
            }
        }
    }

    const hasErrors = parseErrors.length > 0 || issues.length > 0;

    return {
        version: packageVersion,
        hasErrors,
        parseErrors,
        issues,
        values,
    };
}
```

- [ ] **Step 4: Run the tests — confirm they pass**

```bash
pnpm exec jest src/serializer.spec.ts
```

Expected: all tests PASS (14 tests including the 4 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/serializer.ts src/serializer.spec.ts
git commit -m "feat: implement secret key redaction in serializer"
```

---

## Task 3: Update CLI and integration tests

**Files:**
- Modify: `src/bin/varsentry.ts`
- Modify: `tests/cli.integration.test.ts`

- [ ] **Step 1: Write the new integration tests and update the existing one**

In `tests/cli.integration.test.ts`, find the `"--json output"` describe block. Make two changes:

**Change 1** — Update the existing `"--redact without --json"` test (currently expects a warning in stderr). Replace it:

```ts
it("does not emit a warning when --redact is passed without --json", () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

    const result = runCLI(["--redact"], dir);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("--redact");
});
```

**Change 2** — Add three new tests at the end of the `"--json output"` describe block:

```ts
it("replaces secret var values with [REDACTED] in --json output when --redact is passed", () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, ".env"), "API_KEY=hunter2\nPORT=3000");
    fs.writeFileSync(
        path.join(dir, "schema.js"),
        `module.exports = {
            API_KEY: { type: 'string', required: true, secret: true },
            PORT:    { type: 'number', required: true },
        }`,
    );

    const result = runCLI(["--json", "--redact", "--schema", "schema.js"], dir);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.values["API_KEY"]).toBe("[REDACTED]");
    expect(parsed.values["PORT"]).toBe(3000);
});

it("shows full secret var values in --json output without --redact", () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, ".env"), "API_KEY=hunter2");
    fs.writeFileSync(
        path.join(dir, "schema.js"),
        `module.exports = { API_KEY: { type: 'string', secret: true } }`,
    );

    const result = runCLI(["--json", "--schema", "schema.js"], dir);

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.values["API_KEY"]).toBe("hunter2");
});

it("suppresses raw error values from human-readable output when --redact is passed", () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, ".env"), "PORT=not-a-number");
    fs.writeFileSync(
        path.join(dir, "schema.js"),
        `module.exports = { PORT: { type: 'number', required: true } }`,
    );

    const result = runCLI(["--redact", "--schema", "schema.js"], dir);

    expect(result.status).toBe(3);
    expect(result.stderr).toContain("PORT");
    expect(result.stderr).not.toContain("not-a-number");
});
```

- [ ] **Step 2: Run the integration tests — confirm they fail**

```bash
pnpm test -- --testPathPattern=cli.integration
```

Expected: several failures — the CLI still emits the `--redact` warning, doesn't extract `secretKeys`, and `formatErrors` doesn't suppress raw values.

- [ ] **Step 3: Update `src/bin/varsentry.ts`**

Make four changes to the file:

**Change 1** — Remove the `--redact` warning block (lines 103–107):

Delete these lines:
```ts
    if (options.redact && !options.json) {
        console.error(
            "varsentry: --redact has no effect without --json",
        );
    }
```

**Change 2** — Update `formatErrors` to accept and use a `redact` parameter:

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

**Change 3** — After `loadSchema()`, extract `secretKeys` and pass them into the `serialize()` call in the validation/JSON path:

```ts
    const schema = loadSchema(options.schema);
    const secretKeys = Object.keys(schema).filter((k) => schema[k].secret);
    const validationResult = validate(parseResult.values, schema, {
        strict: options.strict,
    });

    if (options.json) {
        console.log(
            JSON.stringify(
                serialize(
                    { parseErrors: [], validationResult, secretKeys },
                    { redact: options.redact },
                ),
                null,
                2,
            ),
        );
        process.exit(validationResult.errors.length > 0 ? 3 : 0);
    }
```

**Change 4** — Update both `formatErrors` call sites to pass `options.redact`:

```ts
// Parse error path (was: formatErrors(parseResult.errors))
formatErrors(parseResult.errors, options.redact);

// Validation error path (was: formatErrors(validationResult.errors))
formatErrors(validationResult.errors, options.redact);
```

The complete updated `main()` function should look like:

```ts
function main() {
    const options = parseArgs(process.argv.slice(2));

    // Check for schema file existence (exit 4) before checking the .env file (exit 2)
    // so a missing schema is not masked by a missing .env
    if (options.schema) {
        const resolvedSchema = path.resolve(process.cwd(), options.schema);
        if (!fs.existsSync(resolvedSchema)) {
            console.error(
                `varsentry: schema file not found: ${options.schema}`,
            );
            process.exit(4);
        }
    }

    const filePath = path.resolve(process.cwd(), options.file);

    if (!fs.existsSync(filePath)) {
        console.error(`varsentry: file not found: ${options.file}`);
        process.exit(2);
    }

    const input = fs.readFileSync(filePath, "utf8");
    const parseResult = parse(input);

    if (parseResult.errors.length > 0) {
        if (options.json) {
            console.log(
                JSON.stringify(
                    serialize(
                        { parseErrors: parseResult.errors },
                        { redact: options.redact },
                    ),
                    null,
                    2,
                ),
            );
        } else {
            console.error("varsentry: parse errors detected\n");
            formatErrors(parseResult.errors, options.redact);
            console.error(`${parseResult.errors.length} error(s) found.`);
        }
        process.exit(1);
    }

    if (!options.schema) {
        if (options.json) {
            console.log(
                JSON.stringify(
                    serialize({ parseErrors: [] }, { redact: options.redact }),
                    null,
                    2,
                ),
            );
        } else {
            console.log("varsentry: no parse errors detected.");
        }
        process.exit(0);
    }

    const schema = loadSchema(options.schema);
    const secretKeys = Object.keys(schema).filter((k) => schema[k].secret);
    const validationResult = validate(parseResult.values, schema, {
        strict: options.strict,
    });

    if (options.json) {
        console.log(
            JSON.stringify(
                serialize(
                    { parseErrors: [], validationResult, secretKeys },
                    { redact: options.redact },
                ),
                null,
                2,
            ),
        );
        process.exit(validationResult.errors.length > 0 ? 3 : 0);
    }

    if (validationResult.errors.length > 0) {
        console.error("varsentry: validation errors detected\n");
        formatErrors(validationResult.errors, options.redact);
        console.error(`${validationResult.errors.length} error(s) found.`);
        process.exit(3);
    }

    console.log("varsentry: validation passed.");
    process.exit(0);
}
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests PASS (pretest builds first, then all unit + integration tests run).

If any test fails:
- Unit tests only: `pnpm exec jest src/serializer.spec.ts` or `pnpm exec jest src/validator.spec.ts`
- Integration tests only: `pnpm exec jest tests/cli.integration.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/bin/varsentry.ts tests/cli.integration.test.ts
git commit -m "feat: wire secret redaction into CLI, suppress raw values in human-readable output"
```

---

## Final Verification

- [ ] **Run the full test suite one last time**

```bash
pnpm test
```

Expected: all tests PASS, TypeScript compiles cleanly.

- [ ] **Smoke test manually**

```bash
pnpm build

# Create test fixtures
printf "API_KEY=hunter2\nPORT=3000\n" > /tmp/test.env
cat > /tmp/schema.js << 'EOF'
module.exports = {
    API_KEY: { type: 'string', required: true, secret: true },
    PORT:    { type: 'number', required: true },
}
EOF

# 1. --json --redact: API_KEY should be [REDACTED], PORT should be 3000
node dist/bin/varsentry.js --file /tmp/test.env --schema /tmp/schema.js --json --redact

# 2. --json without --redact: API_KEY should show full value
node dist/bin/varsentry.js --file /tmp/test.env --schema /tmp/schema.js --json

# 3. --redact without --json: no warning, exit 0
node dist/bin/varsentry.js --file /tmp/test.env --schema /tmp/schema.js --redact
echo "Exit code: $?"

# 4. --redact with a validation error: raw value should NOT appear in stderr
echo "PORT=bad" > /tmp/test-bad.env
node dist/bin/varsentry.js --file /tmp/test-bad.env --schema /tmp/schema.js --redact
```
