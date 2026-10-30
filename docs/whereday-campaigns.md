# Whereday download attribution

Whereday App Store links rendered by isolated.tech product pages and published
blog, docs, and guide bodies carry Apple's account provider token `126424970`
and a campaign token derived from the page containing the download button.
Other apps and marketing-site destinations are unchanged. No cookies, browser
storage, click logging, or visitor identifiers are added.

## Campaign mapping

| Page | Campaign |
| --- | --- |
| `/apps/isome` | `isolated-isome` |
| `/apps/iso-me` (if used) | `isolated-iso-me` |
| Other product/article paths | `isolated-` + first 12 sanitized path characters + `-` + eight-character path hash |

`lib/whereday-campaigns.ts` is the mapping source of truth. The hash uses the
full path so long article slugs with identical prefixes remain distinct. Query
strings, fragments, and trailing slashes do not create new campaigns. All tokens
fit Apple's 30-character limit. The helper reserves `isolated-home` for `/` and
`isolated-apps` for `/apps`, but those pages currently link to the marketing site,
not directly to the App Store; they will not generate these campaigns as shipped.

To look up an article's token from the repository:

```sh
node --input-type=module -e 'import { createServer } from "vite"; const server = await createServer({ configFile: false }); try { const { wheredayCampaign } = await server.ssrLoadModule("/lib/whereday-campaigns.ts"); console.log(wheredayCampaign("/apps/isome/blog/your-article-slug")); } finally { await server.close(); }'
```

## Reading results

In App Store Connect, select Whereday → Analytics → Acquisition → Campaigns.
Use First-Time Downloads to measure new acquisition; Total Downloads includes
redownloads. This tracks the page of the final App Store click, not the first
page visited or every step through the website. A reader who visits an article,
then opens the product listing and downloads there, gets the product campaign.
Links followed to whereday.com are attributed by that site's own download links.

Apple applies campaign visibility thresholds, reporting delays, and a 24-hour
first-time-download attribution window. Missing campaign rows are not proof of
zero clicks or zero downloads. Historical untagged referrals cannot be assigned
retroactively to pages.

Reference: https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links/
