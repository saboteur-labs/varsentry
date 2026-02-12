import {
    VarsentryError,
    setTypeErrorCode,
    createVarsentryError,
} from "./errors";
export type VarType = "string" | "number" | "boolean";

export interface VarRule {
    type?: VarType;
    required?: boolean;
    validate?: (value: string) => boolean;
}

export type Schema = Record<string, VarRule>;

export interface ValidationError {
    key: string;
    message: string;
}

export interface ValidationResult {
    values: Record<string, unknown>;
    errors: VarsentryError[];
}

interface ValidateOptions {
    strict?: boolean;
}

export function validate(
    input: Record<string, string>,
    schema: Schema,
    options: ValidateOptions = {},
): ValidationResult {
    const values: Record<string, unknown> = {};
    const errors: VarsentryError[] = [];

    const { strict = false } = options;

    // Validate declared schema keys
    for (const key of Object.keys(schema)) {
        const rule = schema[key];
        const raw = input[key];

        if (raw === undefined) {
            if (rule.required) {
                // Missing required variable
                errors.push(
                    createVarsentryError(
                        "VALIDATION_MISSING_REQUIRED",
                        key,
                        undefined,
                        undefined,
                    ),
                );
            }
            continue;
        }

        const type = rule.type ?? "string";
        const coerced = coerceType(raw, type);

        if (coerced === undefined) {
            // Invalid type or coercion failed
            errors.push(
                createVarsentryError(
                    setTypeErrorCode(type),
                    key,
                    undefined,
                    raw,
                ),
            );
            continue;
        }

        if (rule.validate && !rule.validate(raw)) {
            // Custom validation failed
            errors.push(
                createVarsentryError(
                    "CUSTOM_VALIDATION_FAILED",
                    key,
                    undefined,
                    raw,
                ),
            );
            continue;
        }

        values[key] = coerced;
    }

    // Strict mode: detect unknown keys
    if (strict) {
        for (const key of Object.keys(input)) {
            if (!(key in schema)) {
                // Unknown variable
                errors.push(
                    createVarsentryError(
                        "VALIDATION_UNKNOWN_VARIABLE",
                        key,
                        undefined,
                        input[key],
                    ),
                );
            }
        }
    }

    return { values, errors };
}

function coerceType(value: string, type: VarType): unknown | undefined {
    switch (type) {
        case "string":
            return value;

        case "number": {
            const n = Number(value);
            return Number.isNaN(n) ? undefined : n;
        }

        case "boolean": {
            if (value === "true") return true;
            if (value === "false") return false;
            return undefined;
        }

        default:
            return undefined;
    }
}
