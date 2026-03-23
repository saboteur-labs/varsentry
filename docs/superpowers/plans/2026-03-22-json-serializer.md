# JSON Serializer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `src/serializer.ts` and wire it into the CLI, locking down the `--json` output shape and adding `--redact` support.

**Architecture:** A single pure `serialize()` function in `src/serializer.ts` accepts parse errors and an optional validation result, returns a fully shaped `SerializedOutput` object. The CLI assembles the input, calls serialize, and JSON.stringifies the result — replacing three ad-hoc stringify calls with one consistent path.

**Tech Stack:** TypeScript (strict), Node.js 18+, Jest + ts-jest for unit tests, spawnSync-based integration tests.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `tsconfig.json` | Enable `resolveJsonModule` for typed `package.json` import |
| Create | `src/serializer.ts` | `serialize()` function + all exported types |
| Create | `src/serializer.spec.ts` | Unit tests for `serialize()` |
| Modify | `src/bin/varsentry.ts` | Add `--redact` flag; import and call `serialize()`; collapse three JSON paths into one |
| Modify | `tests/cli.integration.test.ts` | Add integration tests for `--json`, `--redact`, and the locked output shape; update the existing `--json` test that checks the old output shape |

---

## Task 1: Enable `resolveJsonModule` in tsconfig

**Files:**
- Modify: `tsconfig.json`

This is required for TypeScript to type the `require("../package.json")` call in the serializer. Without it, the compiler will error on the import.

- [ ] **Step 1: Add `resolveJsonModule` to `tsconfig.json`**

Open `tsconfig.json`. In `compilerOptions`, add `"resolveJsonModule": true` after `"skipLibCheck": true`:

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "CommonJS",
        "moduleResolution": "Node",
        "outDir": "dist",
        "rootDir": "src",
        "strict": true,
        "declaration": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true,
        "resolveJsonModule": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

- [ ] **Step 2: Verify the build still passes**

```bash
pnpm build
```

Expected: no TypeScript errors, `dist/` updated.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable resolveJsonModule in tsconfig"
```

---

## Task 2: Implement `src/serializer.ts` (TDD)

**Files:**
- Create: `src/serializer.spec.ts`
- Create: `src/serializer.ts`

Write all unit tests first, confirm they fail, then implement to make them pass.

- [ ] **Step 1: Write the unit test file**

Create `src/serializer.spec.ts`:

```ts
import { serialize, SerializeInput } from "./serializer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageVersion: string = require("../package.json").version;

describe("serialize", () => {
    describe("happy path", () => {
        it("returns hasErrors false with no errors and values populated", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: { PORT: 3000, DEBUG: true },
                    errors: [],
                },
            };

            const result = serialize(input);

            expect(result.hasErrors).toBe(false);
            expect(result.parseErrors).toEqual([]);
            expect(result.issues).toEqual([]);
            expect(result.values).toEqual({ PORT: 3000, DEBUG: true });
        });

        it("includes version from package.json", () => {
            const result = serialize({ parseErrors: [] });

            expect(result.version).toBe(packageVersion);
        });
    });

    describe("parse errors", () => {
        it("maps parse errors to parseErrors array with correct shape", () => {
            const input: SerializeInput = {
                parseErrors: [
                    {
                        code: "PARSE_MISSING_EQUALS",
                        message: "Malformed env line: no equals sign",
                        line: 3,
                        raw: "BADLINE",
                    },
                ],
            };

            const result = serialize(input);

            expect(result.hasErrors).toBe(true);
            expect(result.parseErrors).toEqual([
                {
                    line: 3,
                    code: "PARSE_MISSING_EQUALS",
                    message: "Malformed env line: no equals sign",
                    raw: "BADLINE",
                },
            ]);
            expect(result.issues).toEqual([]);
        });

        it("falls back to line 0 when line is absent on a parse error", () => {
            const input: SerializeInput = {
                parseErrors: [
                    {
                        code: "PARSE_MISSING_EQUALS",
                        message: "Malformed env line: no equals sign",
                        raw: "BADLINE",
                    },
                ],
            };

            const result = serialize(input);

            expect(result.parseErrors[0].line).toBe(0);
        });
    });

    describe("validation errors", () => {
        it("maps validation errors to issues array with correct shape", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_MISSING_REQUIRED",
                            message: "Missing required variable",
                            key: "DATABASE_URL",
                        },
                    ],
                },
            };

            const result = serialize(input);

            expect(result.hasErrors).toBe(true);
            expect(result.issues).toEqual([
                {
                    severity: "error",
                    code: "VALIDATION_MISSING_REQUIRED",
                    variable: "DATABASE_URL",
                    message: "Missing required variable",
                },
            ]);
        });

        it("falls back to empty string for variable when key is absent", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_MISSING_REQUIRED",
                            message: "Missing required variable",
                        },
                    ],
                },
            };

            const result = serialize(input);

            expect(result.issues[0].variable).toBe("");
        });

        it("includes raw value on issues when present and not redacting", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_INVALID_NUMBER_VALUE",
                            message: "Invalid number value",
                            key: "PORT",
                            raw: "abc",
                        },
                    ],
                },
            };

            const result = serialize(input);

            expect(result.issues[0].raw).toBe("abc");
        });
    });

    describe("redact option", () => {
        it("omits raw from parseErrors when redact is true", () => {
            const input: SerializeInput = {
                parseErrors: [
                    {
                        code: "PARSE_MISSING_EQUALS",
                        message: "Malformed env line: no equals sign",
                        line: 3,
                        raw: "BADLINE",
                    },
                ],
            };

            const result = serialize(input, { redact: true });

            expect(result.parseErrors[0].raw).toBeUndefined();
        });

        it("omits raw from issues when redact is true", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_INVALID_NUMBER_VALUE",
                            message: "Invalid number value",
                            key: "PORT",
                            raw: "abc",
                        },
                    ],
                },
            };

            const result = serialize(input, { redact: true });

            expect(result.issues[0].raw).toBeUndefined();
        });
    });

    describe("no schema (validationResult absent)", () => {
        it("returns empty issues and empty values", () => {
            const input: SerializeInput = { parseErrors: [] };

            const result = serialize(input);

            expect(result.issues).toEqual([]);
            expect(result.values).toEqual({});
        });
    });
});
```

- [ ] **Step 2: Run the tests — confirm they fail**

```bash
pnpm exec jest src/serializer.spec.ts
```

Expected: FAIL — `Cannot find module './serializer'`

- [ ] **Step 3: Create `src/serializer.ts`**

```ts
import type { VarsentryError } from "./errors";
import type { ValidationResult } from "./validator";

export interface SerializeInput {
    parseErrors: VarsentryError[];
    validationResult?: ValidationResult;
}

export interface SerializeOptions {
    redact?: boolean;
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

export interface SerializedOutput {
    version: string;
    hasErrors: boolean;
    parseErrors: SerializedParseError[];
    issues: SerializedIssue[];
    values: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageVersion: string = require("../package.json").version;

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

    const values = input.validationResult?.values ?? {};
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

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/serializer.ts src/serializer.spec.ts
git commit -m "feat: add serializer module with locked JSON output shape"
```

---

## Task 3: Update CLI and integration tests

**Files:**
- Modify: `src/bin/varsentry.ts`
- Modify: `tests/cli.integration.test.ts`

Wire `serialize()` into the CLI, add `--redact`, and lock the integration tests to the new output shape.

- [ ] **Step 1: Write the new integration tests**

Open `tests/cli.integration.test.ts`. Replace the existing `"--json output"` describe block (lines 184–196) with the following expanded block:

```ts
describe("--json output", () => {
    it("outputs valid JSON matching the locked shape on a clean run", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "PORT=3000");
        fs.writeFileSync(
            path.join(dir, "schema.js"),
            `module.exports = { PORT: { type: 'number', required: true } }`,
        );

        const result = runCLI(["--json", "--schema", "schema.js"], dir);

        expect(result.status).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(typeof parsed.version).toBe("string");
        expect(parsed.hasErrors).toBe(false);
        expect(parsed.parseErrors).toEqual([]);
        expect(parsed.issues).toEqual([]);
        expect(parsed.values).toEqual({ PORT: 3000 });
    });

    it("outputs parseErrors array when parse errors are present", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "INVALID");

        const result = runCLI(["--json"], dir);

        expect(result.status).toBe(1);
        const parsed = JSON.parse(result.stdout);
        expect(parsed.hasErrors).toBe(true);
        expect(parsed.parseErrors.length).toBeGreaterThan(0);
        expect(parsed.parseErrors[0].code).toBe("PARSE_MISSING_EQUALS");
        expect(parsed.issues).toEqual([]);
    });

    it("outputs empty issues and empty values when no schema is provided", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

        const result = runCLI(["--json"], dir);

        expect(result.status).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(parsed.hasErrors).toBe(false);
        expect(parsed.issues).toEqual([]);
        expect(parsed.values).toEqual({});
    });

    it("omits raw fields when --redact is passed with --json", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "PORT=abc");
        fs.writeFileSync(
            path.join(dir, "schema.js"),
            `module.exports = { PORT: { type: 'number', required: true } }`,
        );

        const result = runCLI(["--json", "--redact", "--schema", "schema.js"], dir);

        expect(result.status).toBe(3);
        const parsed = JSON.parse(result.stdout);
        expect(parsed.hasErrors).toBe(true);
        expect(parsed.issues[0]).not.toHaveProperty("raw");
    });

    it("emits a warning to stderr when --redact is passed without --json", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

        const result = runCLI(["--redact"], dir);

        expect(result.status).toBe(0);
        expect(result.stderr).toContain("--redact has no effect without --json");
    });
});
```

- [ ] **Step 2: Run the new integration tests — confirm they fail**

```bash
pnpm test -- --testPathPattern=cli.integration
```

Expected: FAIL — the new tests fail because the CLI still uses old output shapes.

- [ ] **Step 3: Update `src/bin/varsentry.ts`**

Replace the entire file with the following:

```ts
#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { parse } from "../parser";
import { validate, Schema } from "../validator";
import { serialize } from "../serializer";

interface CLIOptions {
    file: string;
    json: boolean;
    schema?: string;
    strict: boolean;
    redact: boolean;
}

function parseArgs(argv: string[]): CLIOptions {
    let file = ".env";
    let json = false;
    let schema: string | undefined;
    let strict = false;
    let redact = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--file" || arg === "-f") {
            const next = argv[i + 1];
            if (!next) {
                console.error("varsentry: --file requires a value");
                process.exit(2);
            }
            file = next;
            i++;
        } else if (arg === "--json") {
            json = true;
        } else if (arg === "--schema" || arg === "-s") {
            const next = argv[i + 1];
            if (!next) {
                console.error("varsentry: --schema requires a value");
                process.exit(2);
            }
            schema = next;
            i++;
        } else if (arg === "--strict") {
            strict = true;
        } else if (arg === "--redact") {
            redact = true;
        } else if (arg.startsWith("-")) {
            console.error(`varsentry: unknown flag: ${arg}`);
            process.exit(2);
        }
    }

    return { file, json, schema, strict, redact };
}

function loadSchema(schemaPath: string): Schema {
    const resolved = path.resolve(process.cwd(), schemaPath);

    if (!fs.existsSync(resolved)) {
        console.error(`varsentry: schema file not found: ${schemaPath}`);
        process.exit(4);
    }

    let loaded: unknown;
    try {
        loaded = require(resolved);
    } catch (err) {
        console.error(`varsentry: failed to load schema: ${schemaPath}`);
        console.error(err);
        process.exit(4);
    }

    if (!loaded || typeof loaded !== "object" || Array.isArray(loaded)) {
        console.error(
            `varsentry: schema is invalid: must export a plain object`,
        );
        process.exit(4);
    }

    return loaded as Schema;
}

function formatErrors(
    errors: { key?: string; line?: number; message: string; raw?: string }[],
) {
    for (const err of errors) {
        if ("line" in err && err.line !== undefined) {
            console.error(`Line ${err.line}: ${err.message}`);
            if (err.raw) console.error(`  ${err.raw}`);
        } else if ("key" in err && err.key !== undefined) {
            console.error(`${err.key}: ${err.message}`);
        }
        console.error();
    }
}

function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.redact && !options.json) {
        console.error(
            "varsentry: --redact has no effect without --json",
        );
    }

    // Check schema issues (exit 4) before env file issues (exit 2) so that a
    // missing schema is not masked by a missing .env in the working directory.
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
            formatErrors(parseResult.errors);
            console.error(`${parseResult.errors.length} error(s) found.`);
        }
        process.exit(1);
    }

    if (!options.schema) {
        if (options.json) {
            console.log(
                JSON.stringify(
                    serialize({ parseErrors: [] }),
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
    const validationResult = validate(parseResult.values, schema, {
        strict: options.strict,
    });

    if (options.json) {
        console.log(
            JSON.stringify(
                serialize(
                    { parseErrors: [], validationResult },
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
        formatErrors(validationResult.errors);
        console.error(`${validationResult.errors.length} error(s) found.`);
        process.exit(3);
    }

    console.log("varsentry: validation passed.");
    process.exit(0);
}

main();
```

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: all tests PASS (pretest builds first, then all unit and integration tests run).

If any test fails, check:
- Unit tests for serializer: `pnpm exec jest src/serializer.spec.ts`
- Integration tests: `pnpm exec jest tests/cli.integration.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/bin/varsentry.ts tests/cli.integration.test.ts
git commit -m "feat: wire serializer into CLI, add --redact flag"
```

---

## Final Verification

- [ ] **Run the full test suite one more time**

```bash
pnpm test
```

Expected: all tests PASS, no TypeScript errors.

- [ ] **Smoke test the CLI manually**

```bash
# Build
pnpm build

# No schema - should show empty values and issues
echo "FOO=bar" > /tmp/test.env
node dist/bin/varsentry.js --file /tmp/test.env --json

# With schema and validation error - check shape and redact
echo "PORT=abc" > /tmp/test.env
echo "module.exports = { PORT: { type: 'number', required: true } }" > /tmp/schema.js
node dist/bin/varsentry.js --file /tmp/test.env --schema /tmp/schema.js --json
node dist/bin/varsentry.js --file /tmp/test.env --schema /tmp/schema.js --json --redact

# --redact without --json - should warn
node dist/bin/varsentry.js --file /tmp/test.env --redact
```

Expected outputs:
1. `{ version: "...", hasErrors: false, parseErrors: [], issues: [], values: {} }`
2. `{ ..., hasErrors: true, issues: [{ severity: "error", code: "VALIDATION_INVALID_NUMBER_VALUE", variable: "PORT", raw: "abc", ... }] }`
3. Same as above but no `raw` field on the issue
4. Stderr contains `--redact has no effect without --json`, exits 0
