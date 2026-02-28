/**
 * Shared formatting utilities for prices, dates, and currencies.
 */

/**
 * Format app price for display in store listings.
 * iOS-only apps show "App Store" since pricing is handled there.
 * macOS apps with min_price_cents=0 show "Name your price".
 */
export function formatPrice(
  minCents: number,
  suggestedCents: number | null,
  platforms?: string[]
): string {
  const hasIOS = platforms?.includes("ios");
  const hasMacOS = platforms?.includes("macos");

  // iOS-only apps show "App Store" since pricing is handled there
  if (hasIOS && !hasMacOS) {
    return "App Store";
  }

  // macOS apps use "Name your price" when min is 0
  if (minCents === 0) {
    return "Name your price";
  }

  return `From $${(minCents / 100).toFixed(2)}`;
}

/**
 * Format a date string for display (e.g., "Feb 27, 2026")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format cents as a currency display string (e.g., "$9.99" or "Free")
 */
export function formatCurrency(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format a date string as relative time (e.g., "Today", "3 days ago", "Feb 27, 2026")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return formatDate(dateStr);
}
