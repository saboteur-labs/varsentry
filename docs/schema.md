# Validation Schema

Validation files are exported JavaScript modules.

## Related Types

```ts
export interface VarRule {
    type?: VarType;
    required?: boolean;
    enum?: string[];
    validate?: (value: string) => boolean;
}

export type Schema = Record<string, VarRule>;
```

## Type Reference

| Type      | Description                                        | Value in output |
|-----------|----------------------------------------------------|-----------------|
| `string`  | Any string value (default)                         | string          |
| `number`  | Numeric value, coerced from string                 | number          |
| `boolean` | `"true"` or `"false"` only                        | boolean         |
| `url`     | Valid URL (WHATWG URL standard, any scheme)        | string          |
| `enum`    | One of the values listed in `enum: [...]`          | string          |
| `semver`  | Semantic version string (semver.org v2.0.0 spec)  | string          |

Notes:

- **`url`**: Accepts any scheme supported by the WHATWG URL standard (`https`, `http`, `ftp`, etc.). Protocol is not restricted. A bare domain like `example.com` without a scheme is invalid.
- **`enum`**: Requires an `enum` field listing the allowed values. If `enum` is missing or empty, all values will fail validation.
- **`semver`**: Follows the semver.org v2.0.0 specification. The `v` prefix (e.g., `v1.2.3`) is not valid semver and will fail.

## Example Schema

```js
/** @type {import('varsentry').Schema} */
module.exports = {
    PORT: { type: "number", required: true },
    NODE_ENV: { type: "enum", enum: ["development", "production", "test"], required: true },
    ENABLE_FEATURE: { type: "boolean" },
    API_BASE_URL: { type: "url", required: true },
    APP_VERSION: { type: "semver", required: true },
};
```
