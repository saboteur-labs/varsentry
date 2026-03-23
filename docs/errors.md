# Errors

## Related Modules

- `src/errors.ts`

## Varsentry Error Shape

```ts
type VarsentryError = {
    code: string;
    message: string;
    key?: string;
    line?: number;
    raw?: string;
};
```

## Exit Codes

Varsentry uses deterministic exit codes:

| Code | Meaning                                 | Status  |
| ---- | --------------------------------------- | ------- |
| 0    | No errors (warnings allowed)            | locked  |
| 1    | Parser errors present                   | locked  |
| 2    | Validation errors present               | locked  |
| 3    | Schema issues present                   | locked  |
| 4    | CLI misuse                              | locked  |
| 5    | License validation failure (future use) | pending |

## Error Codes

### Parse errors (exit 1)

| Code                   | Meaning                                              |
| ---------------------- | ---------------------------------------------------- |
| `PARSE_MISSING_EQUALS` | A variable definition is missing an `=` sign         |
| `PARSE_INVALID_LINE`   | A variable definition has an empty key (e.g. `=val`) |

### Validation errors (exit 2)

| Code                               | Meaning                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| `VALIDATION_MISSING_REQUIRED`      | A variable marked `required` in the schema is absent from the file   |
| `VALIDATION_UNKNOWN_VARIABLE`      | A variable has no schema entry and `--strict` mode is enabled        |
| `VALIDATION_INVALID_STRING_VALUE`  | A value failed string type coercion                                  |
| `VALIDATION_INVALID_BOOLEAN_VALUE` | A value failed boolean coercion (only `true`/`false` are accepted)   |
| `VALIDATION_INVALID_NUMBER_VALUE`  | A value failed number type coercion                                  |
| `VALIDATION_CUSTOM_FAILED`         | A custom `validate()` function in the schema returned `false`        |

### Schema errors (exit 3)

| Code                    | Meaning                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `SCHEMA_FILE_NOT_FOUND` | The path passed to `--schema` does not exist on disk               |
| `SCHEMA_LOAD_FAILED`    | The schema file exists but `require()` threw (syntax error, etc.)  |
| `SCHEMA_INVALID`        | The schema does not export a plain object                          |

### CLI errors (exit 4)

| Code                    | Meaning                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `CLI_ENV_FILE_NOT_FOUND`| The `.env` file (default or `--file` path) was not found     |
| `CLI_MISSING_FLAG_VALUE`| A flag (`--file` or `--schema`) was passed without a value   |
| `CLI_UNKNOWN_FLAG`      | An unrecognized flag was passed to the CLI                   |
