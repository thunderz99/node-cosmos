# Working in node-cosmos

## Project and compatibility

- This is a TypeScript library with Cosmos DB, MongoDB, and PostgreSQL adapters.
- Public exports live in `src/index.ts`; backend implementations live in
  `src/cosmos/impl/` and query builders in `src/cosmos/condition/`.
- Use Node.js 22.13.0 or newer. `.node-version` pins the development version.
- Use npm and the committed `package-lock.json`; install with `npm ci`.
- Keep the CommonJS output compatible. `uuid` stays on the patched 11.1.1 release;
  version 12 and later require a separate module-format migration.
- If RTK is available in the environment, prefix shell commands with `rtk`; use
  `rtk proxy` for commands it does not handle directly.

## Changes and generated files

- Preserve each backend's partition, TTL, etag, query, and connection-lifecycle
  behavior when updating drivers.
- Edit TypeScript sources, then run `npm run build`. `dist/` is tracked and is the
  package's published entry point; include generated changes in the same commit.
- Do not hand-edit generated `dist/` files or the legacy JavaScript copies in
  `src/cosmos/condition/`.
- ESLint uses `eslint.config.js`; formatting follows `.prettierrc`.
- Do not commit `.env`, credentials, connection strings, or test coverage output.

## Validation

- `npm run build`: compile the library and regenerate `dist/`.
- `npm run lint`: check sources, tests, and configuration files.
- `npm run test:unit`: run tests in `tests/unit/` and `tests/cosmos/condition/`
  without connecting to any database.
- `npm run test:integration`: run database-backed tests. These create and delete
  test collections/schemas; use dedicated test databases only. Cosmos DB requires
  `COSMOSDB_CONNECTION_STRING`; PostgreSQL requires
  `POSTGRES_CONNECTION_STRING`; MongoDB uses `MONGODB_CONNECTION_STRING` or the
  local replica set at `mongodb://localhost:27017/?replicaSet=rs0`.
- `npm test -- --runInBand --watchman=false`: run all unit and integration tests.
- `npm run audit:dependencies`: audit the complete locked dependency tree.
- Before opening or updating a PR, run build, lint, unit tests, **local integration
  tests for all three backends**, dependency audit, and `git diff --check`.
  CI results do not replace local integration testing.

## Required local integration testing

- Check the existing process environment and local `.env` for the connection
  settings listed above before running tests. Do not print or commit credentials.
- Run `npm run test:integration` locally to cover Cosmos DB, MongoDB, and
  PostgreSQL. Run this in addition to `npm run test:unit`; unit tests alone are
  insufficient for PR validation.
- Local execution means running the test runner on the development machine.
  Cosmos DB tests may connect to the Azure test account configured in `.env`;
  they are not restricted to a local emulator. Use dedicated test databases and
  allow the existing test cleanup hooks to remove their test collections/schemas.
- If running suites separately, execute every backend's suites. For example,
  run the Cosmos DB suites explicitly with:

  ```sh
  npm run test:integration -- --runTestsByPath tests/cosmos/CosmosBuilder.test.ts tests/cosmos/cosmosdb/CosmosImpl.test.ts
  ```

- If configuration, credentials, or a service is unavailable, attempt the
  applicable local tests and report the blocker and unverified backend explicitly.
  Do not silently skip a backend, substitute a green CI run, or report an unrun
  suite as passing.
- Record local unit and integration results separately in the PR, including the
  backends exercised, suite/test counts, failures, and any remaining verification
  gaps. A clean audit and passing tests do not prove downstream application
  compatibility.
