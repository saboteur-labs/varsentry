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
    redact: boolean,
) {
    for (const err of errors) {
        if ("line" in err && err.line !== undefined) {
            console.error(`Line ${err.line}: ${err.message}`);
            if (err.raw && !redact) console.error(`  ${err.raw}`);
        } else if ("key" in err && err.key !== undefined) {
            console.error(`${err.key}: ${err.message}`);
            if (err.raw && !redact) console.error(`  ${err.raw}`);
        }
        console.error();
    }
}

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

main();
