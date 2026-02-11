import { parse } from "../src/parser";

describe("parse", () => {
    it("parses a single key=value pair", () => {
        const input = `FOO=bar`;

        const result = parse(input);

        expect(result.values).toEqual({ FOO: "bar" });
    });

    it("parses multiple lines", () => {
        const input = `
FOO=bar
BAZ=qux
`;

        const result = parse(input);

        expect(result.values).toEqual({
            FOO: "bar",
            BAZ: "qux",
        });
    });

    it("trims whitespace around keys", () => {
        const input = `  FOO  =bar`;

        const result = parse(input);

        expect(result.values).toEqual({ FOO: "bar" });
    });

    it("preserves value whitespace", () => {
        const input = `FOO=   bar   `;

        const result = parse(input);

        expect(result.values).toEqual({ FOO: "   bar   " });
    });

    it("ignores blank lines", () => {
        const input = `

FOO=bar

`;

        const result = parse(input);

        expect(result.values).toEqual({ FOO: "bar" });
    });

    it("ignores full-line comments", () => {
        const input = `
# this is a comment
FOO=bar
`;

        const result = parse(input);

        expect(result.values).toEqual({ FOO: "bar" });
    });

    it("overwrites duplicate keys (last wins)", () => {
        const input = `
FOO=first
FOO=second
`;

        const result = parse(input);

        expect(result.values).toEqual({ FOO: "second" });
    });

    it("collects errors on malformed lines (no equals)", () => {
        const input = `INVALID_LINE`;
        const result = parse(input);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toMatch(/Malformed env line/);
    });

    it("collects errors on empty key", () => {
        const input = `=value`;
        const result = parse(input);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toMatch(/Malformed env line/);
    });

    it("collects multiple errors", () => {
        const input = `
INVALID_LINE
=emptykey
`;
        const result = parse(input);
        console.log(result);

        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].message).toMatch(/Malformed env line/);
        expect(result.errors[1].message).toMatch(/Malformed env line/);
    });
    it("handles valid lines and errors together", () => {
        const input = `
FOO=bar
INVALID_LINE
=emptykey
BAZ=qux
`;
        const result = parse(input);
        console.log(result);

        expect(result.values).toEqual({
            FOO: "bar",
            BAZ: "qux",
        });
        expect(result.errors).toHaveLength(2);
    });
});
