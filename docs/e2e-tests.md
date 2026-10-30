# Browser E2E tests

Run `npm ci`, `npx playwright install --with-deps chromium`, then `npm run test:e2e`.
CI pins Ubuntu 24.04 because the locked Playwright 1.58.2 release does not support Ubuntu 26.04.

Playwright starts its own local Vinext server, applies all D1 migrations, and resets
only `.wrangler/e2e` before each run. The dedicated `tests/e2e/wrangler.jsonc`
uses local D1, R2, and KV bindings, synthetic IDs, and a local test secret.
No Cloudflare login or production bindings are needed. Tests run with one worker
because their fixtures share and reseed the database.

The default origin is `http://localhost:3000`. Keep `localhost` for the authenticated
fixtures: Chromium supports Secure cookies there, and the test endpoint signs
cookies using Better Auth's configured cookie names. Production secure-cookie
requirements remain enabled, and the test endpoint rejects production requests.

To use a separately managed test deployment, set `TEST_BASE_URL`; Playwright then
skips local server startup. That deployment must provide the test fixture endpoints
and disposable data. Do not point the suite at production.

CI uploads the HTML report as `playwright-report`. Browser failures fail the E2E
job and the aggregate test check. E2E runs on main and same-repository pull
requests; the aggregate allows the intentional E2E skip on fork pull requests.

Fixture seeding upserts apps and versions without deleting existing purchases.
`tests/e2e/test-data.spec.ts` checks repeated seeding, purchase creation, and
cleanup against the real local D1 database. The migration tests also verify all
foreign keys point at existing tables and repair migrations preserve data.
