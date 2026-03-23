# Validation Schema

Validation files are exported JavaScript modules.

## Related Types

```ts
export interface VarRule {
    type?: VarType;
    required?: boolean;
    validate?: (value: string) => boolean;
}

export type Schema = Record<string, VarRule>;
```

## Example Schema

```js
/** @type {import('varsentry').Schema} */
module.exports = {
    PORT: { type: "number", required: true },
    NODE_ENV: {
        validate: (value) =>
            ["development", "production", "test"].includes(value),
        required: true,
    },
    ENABLE_FEATURE: { type: "boolean" },
};
```
