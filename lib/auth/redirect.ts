const DEFAULT_REDIRECT_PATH = "/dashboard";

/**
 * Sanitize a post-auth redirect path to prevent open redirects.
 * Allows only same-origin relative paths (e.g. /apps/timeprint?x=1).
 */
export function sanitizeRedirectPath(
  redirect: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH
): string {
  if (!redirect) return fallback;
  if (typeof redirect !== "string") return fallback;

  const trimmed = redirect.trim();
  if (!trimmed) return fallback;

  // Only allow site-relative paths.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  // Basic protocol guard in case of encoded absolute/protocol-relative attempts.
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("/http:") || lower.startsWith("/https:")) {
    return fallback;
  }

  try {
    const url = new URL(trimmed, "https://isolated.tech");
    if (url.origin !== "https://isolated.tech") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthRedirectUrl(path: string): string {
  const safePath = sanitizeRedirectPath(path, "/");
  return `/auth/login?redirect=${encodeURIComponent(safePath)}`;
}

export { DEFAULT_REDIRECT_PATH };
