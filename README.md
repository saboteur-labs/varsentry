# Varsentry

Deterministic environment validation CLI for Node.js projects.
Validate .env variables, runtime versions, and configuration integrity before your application runs.

Varsentry is designed for local development, CI pipelines, and production preflight checks. It provides structured output and stable exit codes for automation.

## Why Varsentry?

Most tools validate environment variables inside application code. Varsentry validates configuration before execution.

It is built for:

- Preventing misconfiguration from reaching production

- CI pipeline enforcement

- Detecting version mismatches early

- Enforcing required environment contracts

- Producing deterministic machine-readable output

Varsentry does not modify files. It performs analysis only.

## Installation

```bash
npm install -D @saboteur-labs/varsentry
```

Or run directly

```bash
npx @saboteur-labs/varsentry
```

If installed locally, you can run

```bash
varsentry
```

## Example Usage

Run against current directory:

```bash
varsentry
```

Run against a specific path:

```bash
varsentry --file ./app/.env.development
```

JSON output:

```bash
varsentry --json --schema varsentry.config.js
```

Safe-for-logging mode (redacts `raw` error values and secret-marked variable values):

```bash
varsentry --json --redact --schema varsentry.config.js
```

## Exit Codes

Varsentry uses deterministic exit codes:

| Code | Meaning                                 | Status  |
| ---- | --------------------------------------- | ------- |
| 0    | No errors (warnings allowed)            | locked  |
| 1    | Parser errors present                   | locked  |
| 2    | CLI misuse                              | locked  |
| 3    | Validation errors present               | locked  |
| 4    | Schema issues present                   | locked  |
| 5    | License validation failure (future use) | pending |

## JSON Output

Pass `--json` to receive structured output on stdout:

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
            "message": "Required variable \"DATABASE_URL\" is missing",
            "raw": "DATABASE_URL="
        }
    ],
    "values": {
        "PORT": 3000
    }
}
```

Pass `--redact` to produce safe-for-logging output: `raw` fields are omitted from `parseErrors` and `issues`, and any variable marked `secret: true` in the schema has its value replaced with `"[REDACTED]"` in `values`.

`--redact` also suppresses raw error values from human-readable (non-JSON) stderr output.

The JSON schema is additive-only after 1.0.0.

## Project Status

Varsentry is currently in early development (0.x).

Breaking changes may occur until 1.0.0.
After 1.0.0, strict Semantic Versioning will be enforced.

## Development

### Requirements

- Node.js >= 18
- pnpm (recommended) or npm

### Setup

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

Jest is used for behavior-locking tests to ensure deterministic output and stable contracts.

## Philosophy

Varsentry is:

- Deterministic
- Non-destructive
- CI-first
- Explicit in failure modes
- Focused on configuration integrity

It is not:

- A runtime schema validation library
- A dotenv replacement
- A configuration mutation tool

## License

MIT © Saboteur Labs

## Contributing

Contributions are welcome.

Before submitting changes that alter observable behavior (CLI flags, exit codes, JSON schema), please open an issue for discussion.

## Roadmap

Varsentry is being developed as a deterministic preflight validation tool for Node.js environments. The roadmap reflects both feature maturity and long-term sustainability.

### Phase 0 — Core Stability (0.x)

Goal: Lock the public contract.

- [x] .env parsing and variable validation
- [x] Required / optional enforcement
- [x] Type validation (number, boolean, url, enum, semver)
- [ ] Runtime version checks (Node, selected dependencies)
- [x] Deterministic exit codes
- [x] Stable JSON output schema
- [x] Behavior-locking test suite
- [ ] Node preset (baseline project validation)

Focus during this phase is correctness, predictability, and CI safety.

### Phase 1 — 1.0 Release

Goal: Establish a stable, CI-safe validation contract.

- JSON schema declared stable (additive-only)
- CLI flags frozen under SemVer discipline
- Preset system finalized
- Documentation hardened for production use
- Initial adoption push

After 1.0.0, breaking changes occur only in major releases.

### Phase 2 — Ecosystem Presets (Open Core)

Goal: Expand usefulness without increasing integration burden.

Planned preset profiles:

- Node (baseline)
- Express
- Vite
- Next.js
- API server patterns
- Dockerized app preset

These remain MIT-licensed and form the stable core.

### Phase 3 — Advanced Validation Packs (Commercial Layer)

Goal: Introduce optional paid extensions without disrupting the open core.

Potential offerings:

- Extended preset packs (framework-specific deep checks)
- Organization policy enforcement (custom rule bundles)
- CI compliance profiles
- Advanced runtime dependency graph validation
- Configuration drift detection rules
- Machine-enforced environment contracts

Commercial features would be additive and non-breaking to the open CLI.

### Phase 4 — Enterprise Capabilities

Goal: Provide value for teams managing multiple services.

Exploratory features:

- Shared policy distribution across repositories
- Centralized rule definitions
- Audit-friendly JSON reports
- Extended license-based validation rules
- Long-term support builds

These features would build on the deterministic CLI foundation.

### Monetization Philosophy

Varsentry follows an open-core model:

- The core validator remains MIT-licensed.
- Paid features extend capability, not restrict baseline functionality.
- CI determinism and exit codes remain stable and trustworthy.

The long-term value proposition is reliability, enforcement, and organizational safety — not artificial restriction.

### Current Priority

The immediate focus is shipping a stable 0.1.0 core validator and locking observable behavior before expanding surface area.
