import type { VarType } from "./validator";
export const ERROR_CODES = {
    // Parse errors (exit 1)
    PARSE_INVALID_LINE: "PARSE_INVALID_LINE",
    PARSE_MISSING_EQUALS: "PARSE_MISSING_EQUALS",
    // Validation errors (exit 2)
    VALIDATION_MISSING_REQUIRED: "VALIDATION_MISSING_REQUIRED",
    VALIDATION_UNKNOWN_VARIABLE: "VALIDATION_UNKNOWN_VARIABLE",
    VALIDATION_INVALID_STRING_VALUE: "VALIDATION_INVALID_STRING_VALUE",
    VALIDATION_INVALID_BOOLEAN_VALUE: "VALIDATION_INVALID_BOOLEAN_VALUE",
    VALIDATION_INVALID_NUMBER_VALUE: "VALIDATION_INVALID_NUMBER_VALUE",
    VALIDATION_CUSTOM_FAILED: "VALIDATION_CUSTOM_FAILED",
    // Schema errors (exit 3)
    SCHEMA_FILE_NOT_FOUND: "SCHEMA_FILE_NOT_FOUND",
    SCHEMA_LOAD_FAILED: "SCHEMA_LOAD_FAILED",
    SCHEMA_INVALID: "SCHEMA_INVALID",
    // CLI errors (exit 4)
    CLI_ENV_FILE_NOT_FOUND: "CLI_ENV_FILE_NOT_FOUND",
    CLI_MISSING_FLAG_VALUE: "CLI_MISSING_FLAG_VALUE",
    CLI_UNKNOWN_FLAG: "CLI_UNKNOWN_FLAG",
} as const;

export const ERROR_MESSAGES = {
    [ERROR_CODES.PARSE_INVALID_LINE]: "Malformed env line",
    [ERROR_CODES.PARSE_MISSING_EQUALS]: "Malformed env line: no equals sign",
    [ERROR_CODES.VALIDATION_MISSING_REQUIRED]: "Missing required variable",
    [ERROR_CODES.VALIDATION_UNKNOWN_VARIABLE]: "Unknown variable",
    [ERROR_CODES.VALIDATION_INVALID_STRING_VALUE]: "Invalid string value",
    [ERROR_CODES.VALIDATION_INVALID_BOOLEAN_VALUE]: "Invalid boolean value",
    [ERROR_CODES.VALIDATION_INVALID_NUMBER_VALUE]: "Invalid number value",
    [ERROR_CODES.VALIDATION_CUSTOM_FAILED]: "Custom validation failed",
    [ERROR_CODES.SCHEMA_FILE_NOT_FOUND]: "Schema file not found",
    [ERROR_CODES.SCHEMA_LOAD_FAILED]: "Failed to load schema",
    [ERROR_CODES.SCHEMA_INVALID]: "Schema is invalid",
    [ERROR_CODES.CLI_ENV_FILE_NOT_FOUND]: "Environment file not found",
    [ERROR_CODES.CLI_MISSING_FLAG_VALUE]: "Flag requires a value",
    [ERROR_CODES.CLI_UNKNOWN_FLAG]: "Unknown flag",
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
            return "VALIDATION_INVALID_STRING_VALUE";
        case "boolean":
            return "VALIDATION_INVALID_BOOLEAN_VALUE";
        case "number":
            return "VALIDATION_INVALID_NUMBER_VALUE";
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
