/**
 * App Store Connect API client for fetching customer reviews
 * 
 * Setup:
 * 1. Create an API key in App Store Connect → Users and Access → Keys
 * 2. Download the .p8 private key file
 * 3. Note the Key ID and Issuer ID
 * 
 * Environment variables needed:
 * - APP_STORE_CONNECT_KEY_ID: The Key ID (e.g., "27W9MMWNCC")
 * - APP_STORE_CONNECT_ISSUER_ID: The Issuer ID from App Store Connect
 * - APP_STORE_CONNECT_PRIVATE_KEY: The .p8 key contents (with newlines as \n)
 */

const API_BASE = "https://api.appstoreconnect.apple.com/v1";

interface AppStoreReview {
  id: string;
  type: "customerReviews";
  attributes: {
    rating: number;
    title: string | null;
    body: string | null;
    reviewerNickname: string;
    createdDate: string;
    territory: string;
  };
  relationships?: {
    response?: {
      data: { id: string; type: string } | null;
    };
  };
}

interface AppStoreReviewsResponse {
  data: AppStoreReview[];
  links: {
    self: string;
    next?: string;
  };
  meta?: {
    paging: {
      total: number;
      limit: number;
    };
  };
}

export interface NormalizedAppStoreReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewerNickname: string;
  territory: string;
  createdDate: string;
}

/**
 * Generate a signed JWT for App Store Connect API authentication
 * Uses ES256 (ECDSA with P-256 and SHA-256)
 */
async function generateJWT(
  keyId: string,
  issuerId: string,
  privateKeyPem: string
): Promise<string> {
  // JWT Header
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };

  // JWT Payload - token valid for 20 minutes
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: "appstoreconnect-v1",
  };

  // Base64URL encode
  const base64url = (obj: Record<string, unknown>) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const headerB64 = base64url(header);
  const payloadB64 = base64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Parse PEM private key
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  
  const keyData = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  // Import key for signing
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  // Convert signature to base64url
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signingInput}.${signatureB64}`;
}

export interface AppStoreConnectConfig {
  keyId: string;
  issuerId: string;
  privateKey: string;
}

/**
 * Create an App Store Connect API client
 */
export function createAppStoreConnectClient(config: AppStoreConnectConfig) {
  let cachedToken: { token: string; expiresAt: number } | null = null;

  async function getToken(): Promise<string> {
    const now = Date.now();
    
    // Reuse token if it has more than 2 minutes left
    if (cachedToken && cachedToken.expiresAt - now > 2 * 60 * 1000) {
      return cachedToken.token;
    }

    const token = await generateJWT(config.keyId, config.issuerId, config.privateKey);
    cachedToken = {
      token,
      expiresAt: now + 18 * 60 * 1000, // 18 minutes (2 min buffer)
    };

    return token;
  }

  async function request<T>(path: string): Promise<T> {
    const token = await getToken();
    
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`App Store Connect API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  return {
    /**
     * Fetch all customer reviews for an app
     * @param appId - The App Store app ID (numeric, e.g., "1234567890")
     * @param limit - Max reviews per page (1-200, default 50)
     * @param sortBy - Sort order (default: most recent first)
     */
    async getReviews(
      appId: string,
      options: {
        limit?: number;
        sortBy?: "createdDate" | "-createdDate" | "rating" | "-rating";
        maxPages?: number;
      } = {}
    ): Promise<NormalizedAppStoreReview[]> {
      const { limit = 50, sortBy = "-createdDate", maxPages = 10 } = options;
      const reviews: NormalizedAppStoreReview[] = [];
      
      let path = `/apps/${appId}/customerReviews?limit=${limit}&sort=${sortBy}`;
      let page = 0;

      while (path && page < maxPages) {
        const response = await request<AppStoreReviewsResponse>(path);
        
        for (const review of response.data) {
          reviews.push({
            id: review.id,
            rating: review.attributes.rating,
            title: review.attributes.title,
            body: review.attributes.body,
            reviewerNickname: review.attributes.reviewerNickname,
            territory: review.attributes.territory,
            createdDate: review.attributes.createdDate,
          });
        }

        // Get next page URL if exists
        if (response.links.next) {
          path = response.links.next.replace(API_BASE, "");
        } else {
          path = "";
        }
        
        page++;
      }

      return reviews;
    },

    /**
     * Get reviews created after a specific date
     */
    async getReviewsSince(
      appId: string,
      since: Date
    ): Promise<NormalizedAppStoreReview[]> {
      const allReviews = await this.getReviews(appId, { 
        limit: 200, 
        sortBy: "-createdDate",
        maxPages: 50 
      });
      
      return allReviews.filter(
        (r) => new Date(r.createdDate) > since
      );
    },
  };
}

/**
 * Get App Store Connect client from environment
 */
export function getAppStoreConnectClient(env: {
  APP_STORE_CONNECT_KEY_ID?: string;
  APP_STORE_CONNECT_ISSUER_ID?: string;
  APP_STORE_CONNECT_PRIVATE_KEY?: string;
}) {
  const keyId = env.APP_STORE_CONNECT_KEY_ID;
  const issuerId = env.APP_STORE_CONNECT_ISSUER_ID;
  const privateKey = env.APP_STORE_CONNECT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!keyId || !issuerId || !privateKey) {
    throw new Error(
      "Missing App Store Connect credentials. Set APP_STORE_CONNECT_KEY_ID, " +
      "APP_STORE_CONNECT_ISSUER_ID, and APP_STORE_CONNECT_PRIVATE_KEY"
    );
  }

  return createAppStoreConnectClient({ keyId, issuerId, privateKey });
}
