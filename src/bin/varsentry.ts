#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { parse } from "../parser";
import { validate, Schema } from "../validator";

interface CLIOptions {
    file: string;
    json: boolean;
    schema?: string;
    strict: boolean;
}

function parseArgs(argv: string[]): CLIOptions {
    let file = ".env";
    let json = false;
    let schema: string | undefined;
    let strict = false;

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === "--file" || arg === "-f") {
            const next = argv[i + 1];
            if (!next) {
                console.error("varsentry: --file requires a value");
                process.exit(3);
            }
            file = next;
            i++;
        } else if (arg === "--json") {
            json = true;
        } else if (arg === "--schema" || arg === "-s") {
            const next = argv[i + 1];
            if (!next) {
                console.error("varsentry: --schema requires a value");
                process.exit(3);
            }
            schema = next;
            i++;
        } else if (arg === "--strict") {
            strict = true;
        }
    }

    return { file, json, schema, strict };
}

function loadSchema(schemaPath: string): Schema {
    const resolved = path.resolve(process.cwd(), schemaPath);

    if (!fs.existsSync(resolved)) {
        console.error(`varsentry: schema file not found: ${schemaPath}`);
        process.exit(2);
    }

    try {
        const loaded = require(resolved);

        if (!loaded || typeof loaded !== "object") {
            throw new Error("Schema must export an object");
        }

        return loaded;
    } catch (err) {
        console.error(`varsentry: failed to load schema`);
        console.error(err);
        process.exit(2);
    }
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
    const filePath = path.resolve(process.cwd(), options.file);

    if (!fs.existsSync(filePath)) {
        console.error(`varsentry: file not found: ${options.file}`);
        process.exit(3);
    }

    const input = fs.readFileSync(filePath, "utf8");
    const parseResult = parse(input);

    if (parseResult.errors.length > 0) {
        if (options.json) {
            console.log(JSON.stringify(parseResult, null, 2));
        } else {
            console.error("varsentry: parse errors detected\n");
            formatErrors(parseResult.errors);
            console.error(`${parseResult.errors.length} error(s) found.`);
        }
        process.exit(1);
    }

    if (!options.schema) {
        if (options.json) {
            console.log(JSON.stringify(parseResult, null, 2));
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
        console.log(JSON.stringify(validationResult, null, 2));
        process.exit(validationResult.errors.length > 0 ? 2 : 0);
    }

    if (validationResult.errors.length > 0) {
        console.error("varsentry: validation errors detected\n");
        formatErrors(validationResult.errors);
        console.error(`${validationResult.errors.length} error(s) found.`);
        process.exit(2);
    }

    console.log("varsentry: validation passed.");
    process.exit(0);
}

main();
