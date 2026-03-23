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
