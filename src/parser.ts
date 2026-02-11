export function parse(input: string): Record<string, string> {
    const result: Record<string, string> = {};

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
            throw new Error(`Malformed env line at ${lineNumber}: missing '='`);
        }

        const rawKey = rawLine.slice(0, equalsIndex);
        const value = rawLine.slice(equalsIndex + 1);

        const key = rawKey.trim();

        if (key === "") {
            throw new Error(`Malformed env line at ${lineNumber}: empty key`);
        }

        result[key] = value;
    });

    return result;
}
