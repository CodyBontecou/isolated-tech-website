# Client Work Screenshots

This project uses **local screenshot assets** for the client showcase instead of external thumbnail services.

## Why

`thum.io` can fail with auth/plan limits ("Image not authorized"), which breaks production previews.
Local assets are stable, versioned in git, and fully under our control.

## Command

```bash
npm run screenshots:client-work
```

This runs:

- `scripts/capture-client-work-screenshots.mjs`
- Playwright (Chromium, headless)
- Viewport: `1600x1000`
- Reads targets automatically from `lib/client-work.ts`
- Writes image files under `public/assets/screenshots/`
- Uses JPEG (`quality: 85`) by default, PNG when output file extension is `.png`

## How targets are discovered

The script auto-builds screenshot targets from each `CLIENT_WORK` entry in `lib/client-work.ts`:

- `primaryUrl` + `previewImage`
- `before.url` + `before.previewImage` (if present)
- `after.url` + `after.previewImage` (if present)

Rules:

- `previewImage` must be a **local path** starting with `/` (e.g. `/assets/screenshots/roofbrite.jpg`)
- matching URL field must be present (`primaryUrl`, `before.url`, or `after.url`)
- duplicate outputs are deduplicated automatically

## Adding a new client screenshot

1. Add/update the client entry in `lib/client-work.ts`:

```ts
{
  slug: "client-slug",
  primaryUrl: "https://example.com/",
  previewImage: "/assets/screenshots/client-slug.jpg"
}
```

2. Run:

```bash
npm run screenshots:client-work
```

3. Commit the generated image(s) in `public/assets/screenshots/`.

If the case study includes before/after comparison, define both URL+image pairs:

- `before.url` + `before.previewImage`
- `after.url` + `after.previewImage`

## Notes

- Capture timing uses a short delay after DOM load for more stable rendering.
- If a site loads slowly or has cookie banners, increase wait time in the script or capture manually for that target.
- Re-run the command whenever a showcased client site has a major visual refresh.
