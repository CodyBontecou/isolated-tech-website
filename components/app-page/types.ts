export interface Review {
  id: string;
  user_id: string;
  app_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  user_name: string | null;
  user_image: string | null;
}

export interface AppStoreReview {
  id: string;
  app_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_nickname: string;
  territory: string;
  app_store_version: string | null;
  review_created_at: string;
  synced_at: string;
}

// Unified review type for display
export interface UnifiedReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  author_name: string | null;
  author_image: string | null;
  source: "site" | "app_store";
  territory?: string;
  app_version?: string | null;
}

export interface ReviewStats {
  avg_rating: number | null;
  review_count: number;
}

export interface CombinedReviewStats {
  avg_rating: number | null;
  review_count: number;
  site_count: number;
  app_store_count: number;
}

export interface App {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  icon_url?: string | null;
  platforms: string;
  min_price_cents: number;
  suggested_price_cents: number | null;
  custom_page_config: string | null;
  is_published?: number;
}

export interface AppPageConfig {
  ios_app_store_url?: string;
  ios_app_store_label?: string;
  /** App Store app ID for fetching reviews (numeric string, e.g., "1234567890") */
  app_store_id?: string;
}

export interface AppPageUser {
  id: string;
  email: string;
  name?: string | null;
  isAdmin?: boolean;
}
