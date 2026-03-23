import { serialize, SerializeInput } from "./serializer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageVersion: string = require("../package.json").version;

describe("serialize", () => {
    describe("happy path", () => {
        it("returns hasErrors false with no errors and values populated", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: { PORT: 3000, DEBUG: true },
                    errors: [],
                },
            };

            const result = serialize(input);

            expect(result.hasErrors).toBe(false);
            expect(result.parseErrors).toEqual([]);
            expect(result.issues).toEqual([]);
            expect(result.values).toEqual({ PORT: 3000, DEBUG: true });
        });

        it("includes version from package.json", () => {
            const result = serialize({ parseErrors: [] });

            expect(result.version).toBe(packageVersion);
        });
    });

    describe("parse errors", () => {
        it("maps parse errors to parseErrors array with correct shape", () => {
            const input: SerializeInput = {
                parseErrors: [
                    {
                        code: "PARSE_MISSING_EQUALS",
                        message: "Malformed env line: no equals sign",
                        line: 3,
                        raw: "BADLINE",
                    },
                ],
            };

            const result = serialize(input);

            expect(result.hasErrors).toBe(true);
            expect(result.parseErrors).toEqual([
                {
                    line: 3,
                    code: "PARSE_MISSING_EQUALS",
                    message: "Malformed env line: no equals sign",
                    raw: "BADLINE",
                },
            ]);
            expect(result.issues).toEqual([]);
        });

        it("falls back to line 0 when line is absent on a parse error", () => {
            const input: SerializeInput = {
                parseErrors: [
                    {
                        code: "PARSE_MISSING_EQUALS",
                        message: "Malformed env line: no equals sign",
                        raw: "BADLINE",
                    },
                ],
            };

            const result = serialize(input);

            expect(result.parseErrors[0].line).toBe(0);
        });
    });

    describe("validation errors", () => {
        it("maps validation errors to issues array with correct shape", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_MISSING_REQUIRED",
                            message: "Missing required variable",
                            key: "DATABASE_URL",
                        },
                    ],
                },
            };

            const result = serialize(input);

            expect(result.hasErrors).toBe(true);
            expect(result.issues).toEqual([
                {
                    severity: "error",
                    code: "VALIDATION_MISSING_REQUIRED",
                    variable: "DATABASE_URL",
                    message: "Missing required variable",
                },
            ]);
        });

        it("falls back to empty string for variable when key is absent", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_MISSING_REQUIRED",
                            message: "Missing required variable",
                        },
                    ],
                },
            };

            const result = serialize(input);

            expect(result.issues[0].variable).toBe("");
        });

        it("includes raw value on issues when present and not redacting", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_INVALID_NUMBER_VALUE",
                            message: "Invalid number value",
                            key: "PORT",
                            raw: "abc",
                        },
                    ],
                },
            };

            const result = serialize(input);

            expect(result.issues[0].raw).toBe("abc");
        });
    });

    describe("redact option", () => {
        it("omits raw from parseErrors when redact is true", () => {
            const input: SerializeInput = {
                parseErrors: [
                    {
                        code: "PARSE_MISSING_EQUALS",
                        message: "Malformed env line: no equals sign",
                        line: 3,
                        raw: "BADLINE",
                    },
                ],
            };

            const result = serialize(input, { redact: true });

            expect(result.parseErrors[0].raw).toBeUndefined();
        });

        it("omits raw from issues when redact is true", () => {
            const input: SerializeInput = {
                parseErrors: [],
                validationResult: {
                    values: {},
                    errors: [
                        {
                            code: "VALIDATION_INVALID_NUMBER_VALUE",
                            message: "Invalid number value",
                            key: "PORT",
                            raw: "abc",
                        },
                    ],
                },
            };

            const result = serialize(input, { redact: true });

            expect(result.issues[0].raw).toBeUndefined();
        });
    });

    describe("no schema (validationResult absent)", () => {
        it("returns empty issues and empty values", () => {
            const input: SerializeInput = { parseErrors: [] };

            const result = serialize(input);

            expect(result.issues).toEqual([]);
            expect(result.values).toEqual({});
        });
    });
});
