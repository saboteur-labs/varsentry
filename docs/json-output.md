# JSON Output

The JSON output shape is locked. Pass `--json` to receive structured output on stdout.

## Shape

```json
{
    "version": "0.1.0",
    "hasErrors": false,
    "parseErrors": [],
    "issues": [],
    "values": {
        "PORT": 3000
    }
}
```

## Fields

| Field | Type | Description |
| --- | --- | --- |
| `version` | `string` | Package version, read from `package.json` |
| `hasErrors` | `boolean` | `true` if `parseErrors` or `issues` is non-empty |
| `parseErrors` | `array` | Malformed lines from `.env` parsing |
| `issues` | `array` | Validation errors from schema rules |
| `values` | `object` | Coerced key-value pairs for all valid variables |

### `parseErrors` entries

| Field | Type | Description |
| --- | --- | --- |
| `line` | `number` | Line number of the malformed entry |
| `code` | `string` | Error code (e.g. `PARSE_MISSING_EQUALS`) |
| `message` | `string` | Human-readable description |
| `raw` | `string?` | The raw line content — omitted when `--redact` is active |

### `issues` entries

| Field | Type | Description |
| --- | --- | --- |
| `severity` | `"error"` | Always `"error"` |
| `code` | `string` | Error code (e.g. `VAR_MISSING`, `VAR_INVALID_TYPE`) |
| `variable` | `string` | The variable key |
| `message` | `string` | Human-readable description |
| `raw` | `string?` | The raw string value from the file — omitted when `--redact` is active |

## Example: validation error

```json
{
    "version": "0.1.0",
    "hasErrors": true,
    "parseErrors": [],
    "issues": [
        {
            "severity": "error",
            "code": "VAR_MISSING",
            "variable": "DATABASE_URL",
            "message": "Required variable \"DATABASE_URL\" is missing"
        }
    ],
    "values": {
        "PORT": 3000
    }
}
```

## Example: parse error

```json
{
    "version": "0.1.0",
    "hasErrors": true,
    "parseErrors": [
        {
            "line": 2,
            "code": "PARSE_MISSING_EQUALS",
            "message": "Line is missing an '=' separator",
            "raw": "INVALID_LINE"
        }
    ],
    "issues": [],
    "values": {}
}
```

## `--redact` mode

Pass `--redact` to produce safe-for-logging output:

- `raw` fields are omitted from `parseErrors` and `issues`
- Variables marked `secret: true` in the schema have their value replaced with `"[REDACTED]"` in `values`

```json
{
    "version": "0.1.0",
    "hasErrors": false,
    "parseErrors": [],
    "issues": [],
    "values": {
        "DATABASE_URL": "[REDACTED]",
        "PORT": 3000
    }
}
```

`--redact` also suppresses raw error values from human-readable (non-JSON) stderr output.

## Stability

The JSON schema is additive-only after 1.0.0. New fields may be added; existing fields will not be removed or renamed in a minor or patch release.
