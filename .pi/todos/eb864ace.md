{
  "id": "eb864ace",
  "title": "[Bundle] Update webhook to handle bundle purchases",
  "tags": [
    "feature",
    "monetization",
    "backend"
  ],
  "status": "open",
  "created_at": "2026-02-28T17:54:14.375Z"
}

Parent: Epic: Bundle Pricing

## Tasks
1. Update `app/api/webhooks/stripe/route.ts`
2. Handle bundle checkout.session.completed
3. Create purchase records for each app
4. Mark purchases with bundle_id

## Webhook Update
```typescript
// In handleCheckoutComplete function

if (metadata.type === "bundle") {
  const { bundle_id, user_id, app_ids, includes_future } = metadata;
  const appIdList = app_ids.split(",");
  
  // Create purchase record for each app in the bundle
  const purchasePromises = appIdList.map(appId => 
    execute(
      `INSERT INTO purchases (id, user_id, app_id, bundle_id, amount_cents, status, created_at)
       VALUES (?, ?, ?, ?, 0, 'completed', datetime('now'))`,
      [nanoid(), user_id, appId, bundle_id]
    )
  );
  
  await Promise.all(purchasePromises);
  
  // If includes_future, we'll check bundle ownership when new apps are added
  // No additional action needed - the flag is stored in the bundle
  
  return;
}
```

## Future App Handling
When checking if a user owns an app:
```typescript
async function userOwnsApp(userId: string, appId: string): Promise<boolean> {
  // Check direct purchase
  const directPurchase = await queryOne(
    "SELECT id FROM purchases WHERE user_id = ? AND app_id = ? AND status = 'completed'",
    [userId, appId]
  );
  if (directPurchase) return true;
  
  // Check if user owns a bundle that includes future apps
  const bundlePurchase = await queryOne(`
    SELECT p.id FROM purchases p
    JOIN bundles b ON p.bundle_id = b.id
    WHERE p.user_id = ? AND p.status = 'completed' AND b.includes_future_apps = 1
  `, [userId]);
  
  return !!bundlePurchase;
}
```
