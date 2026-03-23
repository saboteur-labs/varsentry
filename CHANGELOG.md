# Changelog

## [0.2.0](https://github.com/saboteur-labs/varsentry/compare/varsentry-v0.1.0...varsentry-v0.2.0) (2026-03-23)


### Features

* add basic cli implementation, update jest config and package.json type ([bab2812](https://github.com/saboteur-labs/varsentry/commit/bab2812fdadfedbed2ecd4ccc1bf73dd7186a96a))
* add basic parser and test ([6282efe](https://github.com/saboteur-labs/varsentry/commit/6282efe40a0684d7c455ea06c74c0271b3b1009c))
* add centralized error handling ([79c30c5](https://github.com/saboteur-labs/varsentry/commit/79c30c5e94e14aa95c322141061de885b6097662))
* add parser result and error types, update parser tests ([de3b76e](https://github.com/saboteur-labs/varsentry/commit/de3b76e94b49c5fa765d221d7beaeee031f42b19))
* add secret field to VarRule schema interface ([492a8cc](https://github.com/saboteur-labs/varsentry/commit/492a8cc8fabeafd7d8606ccf75da9365e09602c4))
* add serializer module with locked JSON output shape ([26db424](https://github.com/saboteur-labs/varsentry/commit/26db4242d734db177d8939f69882535a8ef2cb10))
* add url, enum, and semver type validation ([1c610f3](https://github.com/saboteur-labs/varsentry/commit/1c610f35570b460a79fb1dfbc9f05a65cd6cc5e4))
* add validator, tests (validator + cli), and CI ([2f46a71](https://github.com/saboteur-labs/varsentry/commit/2f46a7142b13592b6523599d1707a9b62b88efd8))
* add validator, tests (validator + cli), and CI ([92f6716](https://github.com/saboteur-labs/varsentry/commit/92f67169b416a80ac6a8cb46fd3d51696df8d9b7))
* implement secret key redaction in serializer ([16c0a75](https://github.com/saboteur-labs/varsentry/commit/16c0a75eb90e3a59a749e2a8dd69b924a2d3b98f))
* locked JSON output, serializer module, and secret field redaction ([8c443bc](https://github.com/saboteur-labs/varsentry/commit/8c443bc6db8ea33605af3318950c7fa326e50086))
* wire secret redaction into CLI, suppress raw values in human-readable output ([c969be1](https://github.com/saboteur-labs/varsentry/commit/c969be1f16f2db295c82219c74eb3f6b60cf489d))
* wire serializer into CLI, add --redact flag ([e62e256](https://github.com/saboteur-labs/varsentry/commit/e62e2564e104e7e086fbdea79b8cbefd1412391a))


### Bug Fixes

* address code review findings on CLI and integration tests ([05904a9](https://github.com/saboteur-labs/varsentry/commit/05904a9245df81efba2a0a48852d36d824b8c796))
* update error handling for schema validation ([290c2f6](https://github.com/saboteur-labs/varsentry/commit/290c2f6c66cce9093279c6aeeef9a1a4c508e0bc))
* update exit codes and error handling in CLI and documentation ([6b84f09](https://github.com/saboteur-labs/varsentry/commit/6b84f09b4c0ddc64641c6684a19ee895f99ed1fe))
