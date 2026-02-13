import type { VarType } from "./validator";
export const ERROR_CODES = {
    PARSE_INVALID_LINE: "PARSE_INVALID_LINE",
    PARSE_MISSING_EQUALS: "PARSE_MISSING_EQUALS",
    VALIDATION_MISSING_REQUIRED: "VALIDATION_MISSING_REQUIRED",
    INVALID_STRING_VALUE: "INVALID_STRING_VALUE",
    INVALID_BOOLEAN_VALUE: "INVALID_BOOLEAN_VALUE",
    INVALID_NUMBER_VALUE: "INVALID_NUMBER_VALUE",
    CUSTOM_VALIDATION_FAILED: "CUSTOM_VALIDATION_FAILED",
    VALIDATION_UNKNOWN_VARIABLE: "VALIDATION_UNKNOWN_VARIABLE",
    CLI_ENV_FILE_NOT_FOUND: "CLI_ENV_FILE_NOT_FOUND",
} as const;

export const ERROR_MESSAGES = {
    [ERROR_CODES.PARSE_INVALID_LINE]: "Malformed env line",
    [ERROR_CODES.PARSE_MISSING_EQUALS]: "Malformed env line: no equals sign",
    [ERROR_CODES.VALIDATION_MISSING_REQUIRED]: "Missing required variable",
    [ERROR_CODES.CLI_ENV_FILE_NOT_FOUND]: "Environment file not found",
    [ERROR_CODES.INVALID_STRING_VALUE]: "Invalid string value",
    [ERROR_CODES.INVALID_BOOLEAN_VALUE]: "Invalid boolean value",
    [ERROR_CODES.INVALID_NUMBER_VALUE]: "Invalid number value",
    [ERROR_CODES.CUSTOM_VALIDATION_FAILED]: "Custom validation failed",
    [ERROR_CODES.VALIDATION_UNKNOWN_VARIABLE]: "Unknown variable",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];

export interface ParseError {
    line: number;
    message: ErrorMessage;
    raw: string;
}

export interface VarsentryError {
    code: string;
    message: string;
    key?: string;
    line?: number;
    raw?: string;
}

export function setTypeErrorCode(type: VarType): ErrorCode {
    switch (type) {
        case "string":
            return "INVALID_STRING_VALUE";
        case "boolean":
            return "INVALID_BOOLEAN_VALUE";
        case "number":
            return "INVALID_NUMBER_VALUE";
    }
}

export function createVarsentryError(
    code: ErrorCode,
    key?: string,
    line?: number,
    raw?: string,
): VarsentryError {
    return { code, message: ERROR_MESSAGES[code], key, line, raw };
}
