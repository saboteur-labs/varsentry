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
    it("exits 0 when no parse errors", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

        const result = runCLI([], dir);

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("no parse errors");
    });

    it("exits 1 on parse errors", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "INVALID");

        const result = runCLI([], dir);

        expect(result.status).toBe(1);
        expect(result.stderr).toContain("parse errors");
    });

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

    it("outputs JSON with --json flag", () => {
        const dir = createTempDir();
        fs.writeFileSync(path.join(dir, ".env"), "FOO=bar");

        const result = runCLI(["--json"], dir);

        expect(result.status).toBe(0);

        const parsed = JSON.parse(result.stdout);
        expect(parsed.values).toEqual({ FOO: "bar" });
    });
});
