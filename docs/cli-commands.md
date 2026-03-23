# CLI Commands

Run against current directory:

```bash
varsentry
```

Run against a specific path:

```bash
varsentry -f path/to/.env
varsentry --file path/to/.env
```

Run with schema validation:

```bash
varsentry --s path/to/schema.js
varsentry --schema path/to/schema.js
```

> See docs/schema.md for schema details

Enable JSON output:

```bash
varsentry --json
```

Redact secret values and raw error content from JSON output:

```bash
varsentry --json --redact
```

Run in strict mode:

```bash
varsentry --strict
```
