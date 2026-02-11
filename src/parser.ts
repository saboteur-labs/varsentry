export interface ParseError {
    line: number;
    message: string;
    raw: string;
}

export interface ParseResult {
    values: Record<string, string>;
    errors: ParseError[];
    lineCount: number;
}

/**
 * Parses a .env-like string input into key-value pairs, while collecting errors for malformed lines.
 */
export function parse(input: string): ParseResult {
    const result: Record<string, string> = {};
    const errors: ParseError[] = [];

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
            errors.push({
                line: lineNumber,
                message: `Malformed env line at ${lineNumber}: no equals sign`,
                raw: rawLine,
            });
            return;
        }

        const rawKey = rawLine.slice(0, equalsIndex);
        const value = rawLine.slice(equalsIndex + 1);

        const key = rawKey.trim();

        if (key === "") {
            errors.push({
                line: lineNumber,
                message: `Malformed env line at ${lineNumber}: empty key`,
                raw: rawLine,
            });
            return;
        }

        result[key] = value;
    });

    return { values: result, errors, lineCount: lines.length };
}
