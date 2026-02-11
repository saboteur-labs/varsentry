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
    errors: ValidationError[];
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
    const errors: ValidationError[] = [];

    const { strict = false } = options;

    // Validate declared schema keys
    for (const key of Object.keys(schema)) {
        const rule = schema[key];
        const raw = input[key];

        if (raw === undefined) {
            if (rule.required) {
                errors.push({
                    key,
                    message: "Missing required variable",
                });
            }
            continue;
        }

        const type = rule.type ?? "string";
        const coerced = coerceType(raw, type);

        if (coerced === undefined) {
            errors.push({
                key,
                message: `Invalid ${type} value`,
            });
            continue;
        }

        if (rule.validate && !rule.validate(raw)) {
            errors.push({
                key,
                message: "Custom validation failed",
            });
            continue;
        }

        values[key] = coerced;
    }

    // Strict mode: detect unknown keys
    if (strict) {
        for (const key of Object.keys(input)) {
            if (!(key in schema)) {
                errors.push({
                    key,
                    message: "Unknown variable",
                });
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
