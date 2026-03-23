# JSON Output

> JSON output shape should be considered 'in progress' and subject to change before 1.0 release.

## Example JSON Output

```json
{
    "version": "0.1.0",
    "hasErrors": true,
    "issues": [
        {
            "severity": "error",
            "code": "PARSE_INVALID_LINE",
            "variable": "DATABASE_URL",
            "message": "Required \"DATABASE_URL\" is missing"
        }
    ]
}
```
