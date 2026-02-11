#!/usr/bin/env node

import fs from "fs";
import path from "path";
import process from "process";
import { parse } from "../parser";

interface CLIOptions {
    file: string;
    json: boolean;
}

function parseArgs(argv: string[]): CLIOptions {
    let file = ".env";
    let json = false;

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
        }
    }

    return { file, json };
}

function formatErrors(errors: ReturnType<typeof parse>["errors"]) {
    console.error("varsentry: parse errors detected\n");

    for (const err of errors) {
        console.error(`Line ${err.line}: ${err.message}`);
        console.error(`  ${err.raw}\n`);
    }

    console.error(`${errors.length} error(s) found.`);
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const filePath = path.resolve(process.cwd(), options.file);

    if (!fs.existsSync(filePath)) {
        console.error(`varsentry: file not found: ${options.file}`);
        process.exit(3);
    }

    const input = fs.readFileSync(filePath, "utf8");
    const result = parse(input);

    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.errors.length > 0 ? 1 : 0);
    }

    if (result.errors.length > 0) {
        formatErrors(result.errors);
        process.exit(1);
    }

    console.log("varsentry: no parse errors detected.");
    process.exit(0);
}

main();
