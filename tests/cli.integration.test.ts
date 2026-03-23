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

    describe("exit 2 — validation errors", () => {
        it("exits 2 on validation errors", () => {
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

            expect(result.status).toBe(2);
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

            expect(result.status).toBe(2);
            expect(result.stderr).toContain("Unknown variable");
        });
    });

    describe("exit 3 — schema issues", () => {
        it("exits 3 when schema file is not found", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI(["--schema", "missing.js"], dir);

            expect(result.status).toBe(3);
            expect(result.stderr).toContain("schema file not found");
        });

        it("exits 3 when schema file has a syntax error", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");
            fs.writeFileSync(
                path.join(dir, "bad-schema.js"),
                "module.exports = {{{",
            );

            const result = runCLI(["--schema", "bad-schema.js"], dir);

            expect(result.status).toBe(3);
            expect(result.stderr).toContain("failed to load schema");
        });

        it("exits 3 when schema exports a non-object", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");
            fs.writeFileSync(
                path.join(dir, "bad-schema.js"),
                "module.exports = 42",
            );

            const result = runCLI(["--schema", "bad-schema.js"], dir);

            expect(result.status).toBe(3);
            expect(result.stderr).toContain("schema is invalid");
        });
    });

    describe("exit 4 — CLI misuse", () => {
        it("exits 4 when env file is not found", () => {
            const dir = createTempDir();

            const result = runCLI(["--file", "missing.env"], dir);

            expect(result.status).toBe(4);
            expect(result.stderr).toContain("file not found");
        });

        it("exits 4 when --file is passed without a value", () => {
            const dir = createTempDir();

            const result = runCLI(["--file"], dir);

            expect(result.status).toBe(4);
            expect(result.stderr).toContain("--file requires a value");
        });

        it("exits 4 when --schema is passed without a value", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI(["--schema"], dir);

            expect(result.status).toBe(4);
            expect(result.stderr).toContain("--schema requires a value");
        });

        it("exits 4 when an unknown flag is passed", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI(["--unknown"], dir);

            expect(result.status).toBe(4);
            expect(result.stderr).toContain("unknown flag");
        });
    });

    describe("--json output", () => {
        it("outputs JSON with --json flag", () => {
            const dir = createTempDir();
            fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

            const result = runCLI(["--json"], dir);

            expect(result.status).toBe(0);

            const parsed = JSON.parse(result.stdout);
            expect(parsed.values).toEqual({ FOO: "bar" });
        });
    });
});
