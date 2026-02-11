import { parse } from "../src/parser";

describe("parse", () => {
    it("parses a single key=value pair", () => {
        const input = `FOO=bar`;

        const result = parse(input);

        expect(result).toEqual({ FOO: "bar" });
    });

    it("parses multiple lines", () => {
        const input = `
FOO=bar
BAZ=qux
`;

        const result = parse(input);

        expect(result).toEqual({
            FOO: "bar",
            BAZ: "qux",
        });
    });

    it("trims whitespace around keys", () => {
        const input = `  FOO  =bar`;

        const result = parse(input);

        expect(result).toEqual({ FOO: "bar" });
    });

    it("preserves value whitespace", () => {
        const input = `FOO=   bar   `;

        const result = parse(input);

        expect(result).toEqual({ FOO: "   bar   " });
    });

    it("ignores blank lines", () => {
        const input = `

FOO=bar

`;

        const result = parse(input);

        expect(result).toEqual({ FOO: "bar" });
    });

    it("ignores full-line comments", () => {
        const input = `
# this is a comment
FOO=bar
`;

        const result = parse(input);

        expect(result).toEqual({ FOO: "bar" });
    });

    it("overwrites duplicate keys (last wins)", () => {
        const input = `
FOO=first
FOO=second
`;

        const result = parse(input);

        expect(result).toEqual({ FOO: "second" });
    });

    it("throws on malformed lines (no equals)", () => {
        const input = `INVALID_LINE`;

        expect(() => parse(input)).toThrow();
    });

    it("throws on empty key", () => {
        const input = `=value`;

        expect(() => parse(input)).toThrow();
    });
});
