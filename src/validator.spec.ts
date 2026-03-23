import { validate, Schema } from "../src/validator";

describe("validate", () => {
    describe("required variables", () => {
        it("errors when required variable is missing", () => {
            const schema: Schema = {
                FOO: { required: true },
            };

            const result = validate({}, schema);

            expect(result.errors).toEqual([
                {
                    code: "VALIDATION_MISSING_REQUIRED",
                    line: undefined,
                    raw: undefined,
                    key: "FOO",
                    message: "Missing required variable",
                },
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
                {
                    code: "VALIDATION_INVALID_NUMBER_VALUE",
                    key: "PORT",
                    line: undefined,
                    raw: "abc",
                    message: "Invalid number value",
                },
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
                {
                    code: "VALIDATION_INVALID_BOOLEAN_VALUE",
                    key: "ENABLED",
                    line: undefined,
                    raw: "yes",
                    message: "Invalid boolean value",
                },
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
                {
                    key: "API_KEY",
                    code: "VALIDATION_CUSTOM_FAILED",
                    message: "Custom validation failed",
                    raw: "short",
                },
            ]);
            expect(result.values).toEqual({});
        });
    });

    describe("extended type validation", () => {
        describe("url", () => {
            it("accepts a valid https URL", () => {
                const schema: Schema = {
                    API_URL: { type: "url" },
                };

                const result = validate({ API_URL: "https://example.com" }, schema);

                expect(result.errors).toHaveLength(0);
                expect(result.values).toEqual({ API_URL: "https://example.com" });
            });

            it("accepts a valid http URL", () => {
                const schema: Schema = {
                    API_URL: { type: "url" },
                };

                const result = validate({ API_URL: "http://localhost:3000" }, schema);

                expect(result.errors).toHaveLength(0);
                expect(result.values).toEqual({ API_URL: "http://localhost:3000" });
            });

            it("errors on an invalid URL", () => {
                const schema: Schema = {
                    API_URL: { type: "url" },
                };

                const result = validate({ API_URL: "not-a-url" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_URL_VALUE",
                        key: "API_URL",
                        line: undefined,
                        raw: "not-a-url",
                        message: "Invalid URL value",
                    },
                ]);
                expect(result.values).toEqual({});
            });

            it("errors on a bare domain without scheme", () => {
                const schema: Schema = {
                    API_URL: { type: "url" },
                };

                const result = validate({ API_URL: "example.com" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_URL_VALUE",
                        key: "API_URL",
                        line: undefined,
                        raw: "example.com",
                        message: "Invalid URL value",
                    },
                ]);
                expect(result.values).toEqual({});
            });
        });

        describe("enum", () => {
            it("accepts a value in the allowed list", () => {
                const schema: Schema = {
                    NODE_ENV: { type: "enum", enum: ["development", "production"] },
                };

                const result = validate({ NODE_ENV: "development" }, schema);

                expect(result.errors).toHaveLength(0);
                expect(result.values).toEqual({ NODE_ENV: "development" });
            });

            it("errors on a value not in the allowed list", () => {
                const schema: Schema = {
                    NODE_ENV: { type: "enum", enum: ["development", "production"] },
                };

                const result = validate({ NODE_ENV: "staging" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_ENUM_VALUE",
                        key: "NODE_ENV",
                        line: undefined,
                        raw: "staging",
                        message: "Invalid enum value",
                    },
                ]);
                expect(result.values).toEqual({});
            });

            it("errors when enum list is empty", () => {
                const schema: Schema = {
                    NODE_ENV: { type: "enum", enum: [] },
                };

                const result = validate({ NODE_ENV: "anything" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_ENUM_VALUE",
                        key: "NODE_ENV",
                        line: undefined,
                        raw: "anything",
                        message: "Invalid enum value",
                    },
                ]);
                expect(result.values).toEqual({});
            });

            it("errors when enum field is absent from rule", () => {
                const schema: Schema = {
                    NODE_ENV: { type: "enum" },
                };

                const result = validate({ NODE_ENV: "anything" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_ENUM_VALUE",
                        key: "NODE_ENV",
                        line: undefined,
                        raw: "anything",
                        message: "Invalid enum value",
                    },
                ]);
                expect(result.values).toEqual({});
            });
        });

        describe("semver", () => {
            it("accepts a valid semver string", () => {
                const schema: Schema = {
                    VERSION: { type: "semver" },
                };

                const result = validate({ VERSION: "1.2.3" }, schema);

                expect(result.errors).toHaveLength(0);
                expect(result.values).toEqual({ VERSION: "1.2.3" });
            });

            it("accepts semver with pre-release label", () => {
                const schema: Schema = {
                    VERSION: { type: "semver" },
                };

                const result = validate({ VERSION: "1.2.3-alpha.1" }, schema);

                expect(result.errors).toHaveLength(0);
                expect(result.values).toEqual({ VERSION: "1.2.3-alpha.1" });
            });

            it("accepts semver with build metadata", () => {
                const schema: Schema = {
                    VERSION: { type: "semver" },
                };

                const result = validate({ VERSION: "1.2.3+build.456" }, schema);

                expect(result.errors).toHaveLength(0);
                expect(result.values).toEqual({ VERSION: "1.2.3+build.456" });
            });

            it("accepts semver with pre-release and build metadata", () => {
                const schema: Schema = {
                    VERSION: { type: "semver" },
                };

                const result = validate({ VERSION: "1.2.3-beta.2+build.789" }, schema);

                expect(result.errors).toHaveLength(0);
                expect(result.values).toEqual({ VERSION: "1.2.3-beta.2+build.789" });
            });

            it("errors on semver with leading zeros", () => {
                const schema: Schema = {
                    VERSION: { type: "semver" },
                };

                const result = validate({ VERSION: "1.02.3" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_SEMVER_VALUE",
                        key: "VERSION",
                        line: undefined,
                        raw: "1.02.3",
                        message: "Invalid semver value",
                    },
                ]);
                expect(result.values).toEqual({});
            });

            it("errors on semver with a v prefix", () => {
                const schema: Schema = {
                    VERSION: { type: "semver" },
                };

                const result = validate({ VERSION: "v1.2.3" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_SEMVER_VALUE",
                        key: "VERSION",
                        line: undefined,
                        raw: "v1.2.3",
                        message: "Invalid semver value",
                    },
                ]);
                expect(result.values).toEqual({});
            });

            it("errors on an incomplete version string", () => {
                const schema: Schema = {
                    VERSION: { type: "semver" },
                };

                const result = validate({ VERSION: "1.2" }, schema);

                expect(result.errors).toEqual([
                    {
                        code: "VALIDATION_INVALID_SEMVER_VALUE",
                        key: "VERSION",
                        line: undefined,
                        raw: "1.2",
                        message: "Invalid semver value",
                    },
                ]);
                expect(result.values).toEqual({});
            });
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
                code: "VALIDATION_UNKNOWN_VARIABLE",
                key: "EXTRA",
                line: undefined,
                message: "Unknown variable",
                raw: "value",
            });
            expect(result.values).toEqual({ FOO: "bar" });
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
