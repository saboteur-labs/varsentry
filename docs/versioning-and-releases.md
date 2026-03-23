# Versioning and Releases

Varsentry uses [release-please](https://github.com/googleapis/release-please) to automate versioning, changelog generation, and GitHub Releases. Versioning follows [Semantic Versioning](https://semver.org/) and is driven entirely by commit message conventions.

## How it works

Release Please watches the `main` branch. Each push triggers it to inspect new commits since the last release and decide whether a version bump is warranted. If it is, it opens (or updates) a **Release PR**.

The Release PR:
- bumps the version in `package.json`
- updates `CHANGELOG.md` with an entry for each qualifying commit
- stays open and accumulates further changes until you merge it

When you merge the Release PR:
- the updated `package.json` and `CHANGELOG.md` are committed
- a git tag is created (e.g. `v0.2.0`)
- a GitHub Release is published from that tag

## Commit message conventions

Release Please uses [Conventional Commits](https://www.conventionalcommits.org/). The prefix determines whether a bump is triggered and what kind.

| Prefix | Changelog section | Version bump |
|---|---|---|
| `feat:` | Features | minor |
| `fix:` | Bug Fixes | patch |
| `feat!:` / `fix!:` / `BREAKING CHANGE:` footer | Breaking Changes | major |
| `docs:` | — | none |
| `test:` | — | none |
| `chore:` | — | none |
| `refactor:` | — | none |

Only `feat:` and `fix:` commits (and breaking changes) appear in the changelog and trigger releases. Everything else is ignored by release-please.

### Breaking changes

Two equivalent ways to signal a major bump:

```
feat!: drop support for Node 16
```

```
feat: redesign CLI output format

BREAKING CHANGE: --json output shape has changed; old consumers will break
```

Both produce a `BREAKING CHANGE` section in the changelog and bump the major version.

## Required repository setting

The default `GITHUB_TOKEN` is used by the workflow. For it to open pull requests, enable:

**Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**

## Adding npm publish (when ready)

When you're ready to publish to npm, extend `.github/workflows/release-please.yml` with a second job that runs only when a release is created:

```yaml
jobs:
    release-please:
        runs-on: ubuntu-latest
        outputs:
            release_created: ${{ steps.release.outputs.release_created }}
        steps:
            - uses: googleapis/release-please-action@v4
              id: release
              with:
                  config-file: release-please-config.json
                  manifest-file: .release-please-manifest.json

    publish:
        needs: release-please
        if: ${{ needs.release-please.outputs.release_created == 'true' }}
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - uses: pnpm/action-setup@v2

            - uses: actions/setup-node@v4
              with:
                  node-version: 20.x
                  registry-url: https://registry.npmjs.org
                  cache: pnpm

            - run: pnpm install --frozen-lockfile

            - run: pnpm build

            - run: pnpm publish --access public --no-git-checks
              env:
                  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

You will also need to add an `NPM_TOKEN` secret to the repository (**Settings → Secrets and variables → Actions**), generated from your npm account with **Automation** access level.
