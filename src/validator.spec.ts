import { validate, Schema } from "../src/validator";

describe("validate", () => {
    describe("required variables", () => {
        it("errors when required variable is missing", () => {
            const schema: Schema = {
                FOO: { required: true },
            };

            const result = validate({}, schema);

            expect(result.errors).toEqual([
                { key: "FOO", message: "Missing required variable" },
            ]);
            expect(result.values).toEqual({});
        });

        it("does not error when required variable exists", () => {
            const schema: Schema = {
                FOO: { required: true },
            };

            const result = validate({ FOO: "bar" }, schema);

            expect(result.errors).toHaveLength(0);
            expect(result.values).toEqual({ FOO: "bar" });
        });
    });

    describe("type coercion", () => {
        it("defaults to string type", () => {
            const schema: Schema = {
                FOO: {},
            };

            const result = validate({ FOO: "bar" }, schema);

            expect(result.errors).toHaveLength(0);
            expect(result.values).toEqual({ FOO: "bar" });
        });

        it("coerces number values", () => {
            const schema: Schema = {
                PORT: { type: "number" },
            };

            const result = validate({ PORT: "3000" }, schema);

            expect(result.errors).toHaveLength(0);
            expect(result.values).toEqual({ PORT: 3000 });
        });

        it("errors on invalid number", () => {
            const schema: Schema = {
                PORT: { type: "number" },
            };

            const result = validate({ PORT: "abc" }, schema);

            expect(result.errors).toEqual([
                { key: "PORT", message: "Invalid number value" },
            ]);
            expect(result.values).toEqual({});
        });

        it("coerces boolean true", () => {
            const schema: Schema = {
                ENABLED: { type: "boolean" },
            };

            const result = validate({ ENABLED: "true" }, schema);

            expect(result.errors).toHaveLength(0);
            expect(result.values).toEqual({ ENABLED: true });
        });

        it("coerces boolean false", () => {
            const schema: Schema = {
                ENABLED: { type: "boolean" },
            };

            const result = validate({ ENABLED: "false" }, schema);

            expect(result.errors).toHaveLength(0);
            expect(result.values).toEqual({ ENABLED: false });
        });

        it("errors on invalid boolean", () => {
            const schema: Schema = {
                ENABLED: { type: "boolean" },
            };

            const result = validate({ ENABLED: "yes" }, schema);

            expect(result.errors).toEqual([
                { key: "ENABLED", message: "Invalid boolean value" },
            ]);
            expect(result.values).toEqual({});
        });
    });

    describe("custom validation", () => {
        it("passes when custom validator returns true", () => {
            const schema: Schema = {
                API_KEY: {
                    validate: (value) => value.length === 10,
                },
            };

            const result = validate({ API_KEY: "1234567890" }, schema);

            expect(result.errors).toHaveLength(0);
            expect(result.values).toEqual({ API_KEY: "1234567890" });
        });

        it("errors when custom validator fails", () => {
            const schema: Schema = {
                API_KEY: {
                    validate: (value) => value.length === 10,
                },
            };

            const result = validate({ API_KEY: "short" }, schema);

            expect(result.errors).toEqual([
                { key: "API_KEY", message: "Custom validation failed" },
            ]);
            expect(result.values).toEqual({});
        });
    });

    describe("strict mode", () => {
        it("errors on unknown variables when strict=true", () => {
            const schema: Schema = {
                FOO: {},
            };

            const result = validate({ FOO: "bar", EXTRA: "value" }, schema, {
                strict: true,
            });

            expect(result.errors).toContainEqual({
                key: "EXTRA",
                message: "Unknown variable",
            });
        });

        it("ignores unknown variables when strict=false", () => {
            const schema: Schema = {
                FOO: {},
            };

            const result = validate({ FOO: "bar", EXTRA: "value" }, schema, {
                strict: false,
            });

            expect(result.errors).toHaveLength(0);
            expect(result.values).toEqual({ FOO: "bar" });
        });
    });
});
