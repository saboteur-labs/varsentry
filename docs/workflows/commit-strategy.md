# Commit Strategy

This document defines how commits should be named in this repository. These conventions directly drive automated versioning via release-please — the commit message is the signal that determines whether a release is cut and what version it gets.

Read `docs/versioning-and-releases.md` for the full release workflow.

---

## Format

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

The `(<scope>)` is optional. The short description should be lowercase and not end with a period.

---

## Types and their effect on versioning

| Type | When to use | Triggers release? | Bump |
|---|---|---|---|
| `feat` | New user-facing capability | Yes | minor |
| `fix` | Corrects incorrect behavior | Yes | patch |
| `docs` | Documentation only | No | — |
| `test` | Adding or updating tests | No | — |
| `chore` | Maintenance, tooling, deps | No | — |
| `refactor` | Code restructuring, no behavior change | No | — |
| `ci` | CI/CD workflow changes | No | — |
| `build` | Build system changes | No | — |

Only `feat` and `fix` cut releases. Everything else is invisible to release-please.

---

## Breaking changes

A breaking change bumps the **major** version. Use either form:

**Inline `!` after the type:**
```
feat!: redesign JSON output shape
fix!: exit code 3 now includes schema errors
```

**`BREAKING CHANGE` footer:**
```
feat: add --strict mode for unknown variables

BREAKING CHANGE: --strict now causes exit code 4 instead of 3 for schema errors
```

Both are equivalent. Prefer the `!` form for brevity when no explanation is needed. Use the footer form when the nature of the break needs to be spelled out — the footer text appears verbatim in the changelog.

---

## Choosing the right type

**`feat` vs `fix`**

- `feat` — something that did not exist before. New flag, new validation type, new output field.
- `fix` — something that existed but behaved incorrectly. Wrong exit code, bad parsing, misleading error message.

If you are unsure, ask: *was this behavior promised and broken, or is this genuinely new?* Fixes correct; features add.

**`refactor` vs `fix`**

A `refactor` must not change observable behavior — exit codes, stdout shape, or error messages. If a refactor incidentally corrects something, use `fix`.

**`chore` vs `ci`**

Use `chore` for dependency updates, lockfile changes, and general housekeeping. Use `ci` specifically for changes to `.github/workflows/` or other pipeline configuration.

---

## Scopes

Scopes are optional but useful for orienting readers. Use the module or area being touched:

```
feat(validator): add semver type support
fix(parser): handle lines with no value
docs(schema): clarify enum field behavior
chore(deps): update typescript to 5.9
```

Keep scopes short and consistent. Don't invent a new scope for every commit — prefer the existing ones: `parser`, `validator`, `serializer`, `cli`, `errors`, `deps`, `ci`.

---

## What not to do

**Don't use `feat` for internal-only changes.** If a user running `varsentry` would not notice the change, it is not a feature.

**Don't stack multiple types.** If a commit fixes a bug and adds a feature, split it into two commits. Stacked commits obscure history and misrepresent the version bump.

**Don't use vague descriptions.** These are poor:

```
fix: bug fix
chore: updates
feat: new stuff
```

**Don't omit the type.** Untyped commits are ignored by release-please and disappear from the changelog entirely.

---

## Examples

```
feat(cli): add --redact flag to omit secret values from JSON output
fix(parser): correctly handle lines with inline # comments
fix(validator): treat empty string as missing for required fields
feat!: remove --verbose flag from public CLI interface
docs: add commit strategy guidance
chore(deps): bump jest to 30.2.0
ci: add Node 22 to test matrix
refactor(serializer): extract formatIssue into its own function
test(validator): add coverage for enum with single value
```

---

## Note for AI agents

When writing commit messages on behalf of a human in this repository:

- Always include a type prefix. No exceptions.
- Default to `fix` for corrections, `feat` for additions, `chore` for everything else.
- Use `!` or a `BREAKING CHANGE` footer only when the change affects exit codes, stdout shape, CLI flags, or the schema contract — things a downstream user would have to update their integration for.
- Do not use `feat` for test additions, documentation, or refactors. These do not warrant a version bump.
- When in doubt between `chore` and `refactor`, prefer `chore`. The distinction matters less than getting the `feat`/`fix`/breaking-change signal right.
