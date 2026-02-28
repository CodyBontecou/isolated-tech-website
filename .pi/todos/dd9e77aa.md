{
  "id": "dd9e77aa",
  "title": "Add tests for legacy claims system (lib/legacy-claims.ts)",
  "tags": [
    "testing",
    "critical",
    "revenue"
  ],
  "status": "closed",
  "created_at": "2026-02-28T05:46:25.637Z"
}

## Completed

Created `tests/unit/legacy-claims.test.ts` with 16 tests covering:

### claimLegacyData (10 tests)
- Link subscriber record to user
- Claim legacy purchases and create purchase records
- Handle multiple legacy purchases
- Skip purchase creation for items without app_id
- Prevent duplicate purchase creation
- Case-insensitive email matching
- Correct purchase record structure (amount=0, status=completed)
- Handle database errors gracefully
- Return zero claims when no legacy data
- Skip already-claimed purchases

### hasUnclaimedPurchases (6 tests)
- Return true when unclaimed purchases exist
- Return false when no unclaimed purchases
- Return false when all purchases claimed
- Case-insensitive email matching
- Handle null result gracefully
- Return true for multiple unclaimed purchases
