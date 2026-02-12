import {
    createVarsentryError,
    ErrorCode,
    ERROR_MESSAGES,
    setTypeErrorCode,
} from "./errors";

describe("createVarsentryError", () => {
    it("creates a VarsentryError object", () => {
        const code = "PARSE_INVALID_LINE" as ErrorCode;
        const key = "TEST_KEY";
        const line = 1;
        const error = createVarsentryError(code, key, line);

        expect(error).toEqual({
            code,
            message: ERROR_MESSAGES[code],
            key,
            line,
        });
    });

    it("creates a VarsentryError object without key", () => {
        const code = "CLI_ENV_FILE_NOT_FOUND" as ErrorCode;
        const line = 2;
        const error = createVarsentryError(code, undefined, line);

        expect(error).toEqual({
            code,
            message: ERROR_MESSAGES[code],
            key: undefined,
            line,
        });
    });

    it("creates a VarsentryError object without line", () => {
        const code = "CLI_ENV_FILE_NOT_FOUND" as ErrorCode;
        const key = "Test varsentry error";
        const error = createVarsentryError(code, key);
        expect(error).toEqual({
            code,
            message: ERROR_MESSAGES[code],
            key,
            line: undefined,
        });
    });
});

describe("setTypeErrorCode", () => {
    it("returns the correct error code for string type", () => {
        expect(setTypeErrorCode("string")).toBe("INVALID_STRING_VALUE");
    });

    it("returns the correct error code for boolean type", () => {
        expect(setTypeErrorCode("boolean")).toBe("INVALID_BOOLEAN_VALUE");
    });

    it("returns the correct error code for number type", () => {
        expect(setTypeErrorCode("number")).toBe("INVALID_NUMBER_VALUE");
    });
});
