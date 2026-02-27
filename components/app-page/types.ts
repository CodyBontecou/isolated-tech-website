export interface Review {
  id: string;
  user_id: string;
  app_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  user_name: string | null;
}

export interface ReviewStats {
  avg_rating: number | null;
  review_count: number;
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
}

export interface AppPageUser {
  id: string;
  email: string;
  name?: string | null;
  isAdmin?: boolean;
}
