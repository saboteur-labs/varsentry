# Errors

> Note: Error shape, exit codes and error codes in this document may currently represent an incomplete list. They should be considered 'in progress' and subject to change before 1.0 release.

## Related Modules

- src/errors.ts

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

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 0    | No errors (warnings allowed)            |
| 1    | Parser errors present                   |
| 2    | Validation errors present               |
| 3    | Schema issues present                   |
| 4    | CLI misuse                              |
| 5    | License validation failure (future use) |

## Error Codes

> Note: this is an incomplete list of error codes. Listed codes should be considered 'in progress' and subject to change before 1.0 release

| Error Code (Exit Code)          | Meaning                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| CLI_ENV_FILE_NOT_FOUND (1)      | Varsentry was could not find a `.env` file                                                                      |
| PARSE_MISSING_EQUALS (1)        | During parsing, Varsentry found a variable definition missing the equals sign                                   |
| PARSE_MISSING_KEY (1)           | During parsing, Varsentry found a variable definition that is missing a key                                     |
| VALIDATION_MISSING_REQUIRED (2) | During validation, Varsentry could not find a variable that is marked as `required` in schema                   |
| VALIDATION_UNKNOWN_VARIABLE (2) | During validation, Varsentry found a variable that does not exist in the schema, while running in `strict` mode |
| VALIDATION_INVALID_TYPE (2)     | During validation, Varsentry found a type that is a valid `.env` variable definition or type coercion failed    |
| VALIDATION_MISSING_REQUIRED (3) | During validation, Varsentry could not find a variable marked as `required` in the supplied schema              |
| CLI_ENV_FILE_NOT_FOUND (4)      | Varsentry could not find a `.env` in the current directory or a user-supplied `.env` could not be found         |
