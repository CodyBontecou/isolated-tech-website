{
  "id": "03dca9ca",
  "title": "[Visual] Generate baseline screenshots and commit",
  "tags": [
    "testing",
    "visual-regression",
    "baseline"
  ],
  "status": "open",
  "created_at": "2026-03-01T13:49:24.773Z"
}

## Task
Run all visual tests to generate baseline screenshots, then commit them.

## Steps
1. Run `npm run test:visual:update` to generate baselines
2. Review screenshots in `tests/e2e/visual/__snapshots__/`
3. Commit screenshots to repo
4. Verify CI can run visual tests

## Status
**Ready to run** - Tests are written, configuration is complete.

User needs to run `npm run test:visual:update` with dev server running to capture baselines.
