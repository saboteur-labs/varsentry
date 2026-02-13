import { VarsentryError, createVarsentryError } from "./errors";

export interface ParseResult {
    values: Record<string, string>;
    errors: VarsentryError[];
    lineCount: number;
}

/**
 * Parses a .env-like string input into key-value pairs, while collecting errors for malformed lines.
 */
export function parse(input: string): ParseResult {
    const result: Record<string, string> = {};
    const errors: VarsentryError[] = [];

    const lines = input.split(/\r?\n/);

    lines.forEach((rawLine, index) => {
        const lineNumber = index + 1;
        const trimmed = rawLine.trim();

        // Ignore blank lines
        if (trimmed === "") {
            return;
        }

        // Ignore full-line comments
        if (trimmed.startsWith("#")) {
            return;
        }

        const equalsIndex = rawLine.indexOf("=");

        if (equalsIndex === -1) {
            errors.push(
                createVarsentryError(
                    "PARSE_MISSING_EQUALS",
                    undefined,
                    lineNumber,
                    rawLine,
                ),
            );
            return;
        }

        const rawKey = rawLine.slice(0, equalsIndex);
        const value = rawLine.slice(equalsIndex + 1);

        const key = rawKey.trim();

        if (key === "") {
            errors.push(
                createVarsentryError(
                    "PARSE_INVALID_LINE",
                    undefined,
                    lineNumber,
                    rawLine,
                ),
            );
            return;
        }

        result[key] = value;
    });

    return { values: result, errors, lineCount: lines.length };
}
