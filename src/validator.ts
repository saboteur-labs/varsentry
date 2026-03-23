import {
    VarsentryError,
    setTypeErrorCode,
    createVarsentryError,
} from "./errors";
export type VarType = "string" | "number" | "boolean" | "url" | "enum" | "semver";

export interface VarRule {
    type?: VarType;
    required?: boolean;
    enum?: string[];
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

        const coerced = validateType(raw, rule);

        if (coerced === undefined) {
            // Invalid type or coercion failed
            const type = rule.type ?? "string";
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
                    "VALIDATION_CUSTOM_FAILED",
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

function validateType(value: string, rule: VarRule): unknown | undefined {
    const type = rule.type ?? "string";
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

        case "url": {
            try {
                new URL(value);
                return value;
            } catch {
                return undefined;
            }
        }

        case "enum": {
            const allowed = rule.enum ?? [];
            return allowed.includes(value) ? value : undefined;
        }

        case "semver": {
            const SEMVER_REGEX =
                /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
            return SEMVER_REGEX.test(value) ? value : undefined;
        }
    }
}
