import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CLI_PATH = path.resolve(__dirname, "../dist/bin/varsentry.js");

function runCLI(args: string[], cwd: string) {
    return spawnSync("node", [CLI_PATH, ...args], {
        cwd,
        encoding: "utf8",
    });
}

function createTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "varsentry-test-"));
}

describe("CLI integration", () => {
    describe("exit 0 — success", () => {
        it("exits 0 when no parse errors", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI([], dir);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain("no parse errors");
        });

        it("passes validation with correct schema", () => {
            const dir = createTempDir();

            fs.writeFileSync(path.join(dir, ".env"), "PORT=3000");

            fs.writeFileSync(
                path.join(dir, "schema.js"),
                `
      module.exports = {
        PORT: { type: 'number', required: true }
      }
      `,
            );

            const result = runCLI(["--schema", "schema.js"], dir);

            expect(result.status).toBe(0);
            expect(result.stdout).toContain("validation passed");
        });
    });

    describe("exit 1 — parse errors", () => {
        it("exits 1 on parse errors", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "INVALID");

            const result = runCLI([], dir);

            expect(result.status).toBe(1);
            expect(result.stderr).toContain("parse errors");
        });
    });

    describe("exit 3 — validation errors", () => {
        it("exits 3 on validation errors", () => {
            const dir = createTempDir();

            fs.writeFileSync(path.join(dir, ".env"), "PORT=abc");

            fs.writeFileSync(
                path.join(dir, "schema.js"),
                `
      module.exports = {
        PORT: { type: 'number', required: true }
      }
      `,
            );

            const result = runCLI(["--schema", "schema.js"], dir);

            expect(result.status).toBe(3);
            expect(result.stderr).toContain("validation errors");
        });

        it("supports --strict unknown variable detection", () => {
            const dir = createTempDir();

            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            fs.writeFileSync(
                path.join(dir, "schema.js"),
                `
      module.exports = {}
      `,
            );

            const result = runCLI(["--schema", "schema.js", "--strict"], dir);

            expect(result.status).toBe(3);
            expect(result.stderr).toContain("Unknown variable");
        });
    });

    describe("exit 4 — schema issues", () => {
        it("exits 4 when schema file is not found", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI(["--schema", "missing.js"], dir);

            expect(result.status).toBe(4);
            expect(result.stderr).toContain("schema file not found");
        });

        it("exits 4 when schema file has a syntax error", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");
            fs.writeFileSync(
                path.join(dir, "bad-schema.js"),
                "module.exports = {{{",
            );

            const result = runCLI(["--schema", "bad-schema.js"], dir);

            expect(result.status).toBe(4);
            expect(result.stderr).toContain("failed to load schema");
        });

        it("exits 4 when schema exports a non-object", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");
            fs.writeFileSync(
                path.join(dir, "bad-schema.js"),
                "module.exports = 42",
            );

            const result = runCLI(["--schema", "bad-schema.js"], dir);

            expect(result.status).toBe(4);
            expect(result.stderr).toContain("schema is invalid");
        });
    });

    describe("exit 2 — CLI misuse", () => {
        it("exits 2 when env file is not found", () => {
            const dir = createTempDir();

            const result = runCLI(["--file", "missing.env"], dir);

            expect(result.status).toBe(2);
            expect(result.stderr).toContain("file not found");
        });

        it("exits 2 when --file is passed without a value", () => {
            const dir = createTempDir();

            const result = runCLI(["--file"], dir);

            expect(result.status).toBe(2);
            expect(result.stderr).toContain("--file requires a value");
        });

        it("exits 2 when --schema is passed without a value", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI(["--schema"], dir);

            expect(result.status).toBe(2);
            expect(result.stderr).toContain("--schema requires a value");
        });

        it("exits 2 when an unknown flag is passed", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI(["--unknown"], dir);

            expect(result.status).toBe(2);
            expect(result.stderr).toContain("unknown flag");
        });
    });

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
            expect(parsed.issues.length).toBeGreaterThan(0);
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
});
