"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface App {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  platforms: string;
  min_price_cents: number;
  suggested_price_cents: number | null;
  is_featured: number;
  avg_rating?: number | null;
  review_count?: number;
  latest_release_at?: string | null;
  created_at?: string;
}

type PlatformFilter = "all" | "ios" | "macos" | "both";
type PriceFilter = "all" | "free" | "paid";
type SortOption = "featured" | "name" | "price-low" | "price-high" | "rating" | "recent" | "newest";

interface AppFiltersProps {
  apps: App[];
  showFeaturedSort?: boolean;
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return platformsJson.split(",").map((p) => p.trim().replace(/"/g, ""));
  }
}

function formatPrice(minCents: number, suggestedCents: number | null, platforms?: string[]): string {
  const hasIOS = platforms?.includes("ios");
  const hasMacOS = platforms?.includes("macos");
  
  if (hasIOS && !hasMacOS) {
    return "App Store";
  }
  
  if (minCents === 0) {
    return "Name your price";
  }
  return `From $${(minCents / 100).toFixed(2)}`;
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="store-badge">
      {platform === "ios" ? "iOS" : platform === "macos" ? "macOS" : platform.toUpperCase()}
    </span>
  );
}

function StarRatingCompact({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return null;
  const roundedRating = Math.round(rating * 10) / 10;
  return (
    <div className="star-rating-compact" aria-label={`${roundedRating} out of 5 stars from ${count} reviews`}>
      <span className="star-rating-compact__star">★</span>
      <span className="star-rating-compact__value">{roundedRating.toFixed(1)}</span>
    </div>
  );
}

function AppCard({ app, index }: { app: App; index: number }) {
  const platforms = getPlatforms(app.platforms);
  const price = formatPrice(app.min_price_cents, app.suggested_price_cents, platforms);

  return (
    <Link
      href={`/apps/${app.slug}`}
      className="store-card"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="store-card__icon">
        {app.icon_url ? (
          <img src={app.icon_url} alt={`${app.name} icon`} />
        ) : (
          <span>{app.name[0].toUpperCase()}</span>
        )}
      </div>
      <div className="store-card__content">
        <div className="store-card__badges">
          {platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
        <h2 className="store-card__name">{app.name}</h2>
        {app.tagline && <p className="store-card__tagline">{app.tagline}</p>}
        {app.avg_rating && app.review_count && app.review_count > 0 && (
          <StarRatingCompact rating={app.avg_rating} count={app.review_count} />
        )}
      </div>
      <div className="store-card__footer">
        <span className="store-card__price">
          {price}
        </span>
        <span className="store-card__arrow">→</span>
      </div>
    </Link>
  );
}

export function AppFilters({ apps, showFeaturedSort = true }: AppFiltersProps) {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>(showFeaturedSort ? "featured" : "newest");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const filteredAndSortedApps = useMemo(() => {
    let filtered = [...apps];

    // Platform filter
    if (platformFilter !== "all") {
      filtered = filtered.filter((app) => {
        const platforms = getPlatforms(app.platforms);
        const hasIOS = platforms.includes("ios");
        const hasMacOS = platforms.includes("macos");

        if (platformFilter === "ios") return hasIOS && !hasMacOS;
        if (platformFilter === "macos") return hasMacOS && !hasIOS;
        if (platformFilter === "both") return hasIOS && hasMacOS;
        return true;
      });
    }

    // Price filter
    if (priceFilter !== "all") {
      filtered = filtered.filter((app) => {
        const platforms = getPlatforms(app.platforms);
        const hasIOS = platforms.includes("ios");
        const hasMacOS = platforms.includes("macos");
        const isIOSOnly = hasIOS && !hasMacOS;
        
        // iOS-only apps are handled by App Store, so exclude from price filter
        if (isIOSOnly) return priceFilter === "all";
        
        if (priceFilter === "free") return app.min_price_cents === 0;
        if (priceFilter === "paid") return app.min_price_cents > 0;
        return true;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "featured":
          // Featured first, then by featured_order, then by created_at
          if (a.is_featured !== b.is_featured) {
            return b.is_featured - a.is_featured;
          }
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();

        case "name":
          return a.name.localeCompare(b.name);

        case "price-low":
          return a.min_price_cents - b.min_price_cents;

        case "price-high":
          return b.min_price_cents - a.min_price_cents;

        case "rating":
          // Apps with ratings first, sorted by rating (highest first)
          const aRating = a.avg_rating ?? 0;
          const bRating = b.avg_rating ?? 0;
          const aCount = a.review_count ?? 0;
          const bCount = b.review_count ?? 0;
          
          // If neither has reviews, sort by featured/created
          if (aCount === 0 && bCount === 0) {
            return b.is_featured - a.is_featured;
          }
          // Apps with reviews come first
          if (aCount === 0) return 1;
          if (bCount === 0) return -1;
          // Sort by rating
          return bRating - aRating;

        case "recent":
          // Sort by most recent update
          const aRelease = a.latest_release_at ? new Date(a.latest_release_at).getTime() : 0;
          const bRelease = b.latest_release_at ? new Date(b.latest_release_at).getTime() : 0;
          return bRelease - aRelease;

        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();

        default:
          return 0;
      }
    });

    return filtered;
  }, [apps, platformFilter, priceFilter, sortBy]);

  const activeFilterCount = [
    platformFilter !== "all",
    priceFilter !== "all",
  ].filter(Boolean).length;

  return (
    <>
      {/* Filter Bar */}
      <div className="store-filters">
        <div className="store-filters__row">
          {/* Mobile filter toggle */}
          <button 
            className="store-filters__toggle"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            aria-expanded={isFiltersOpen}
          >
            <span>FILTERS</span>
            {activeFilterCount > 0 && (
              <span className="store-filters__badge">{activeFilterCount}</span>
            )}
            <span className="store-filters__chevron">{isFiltersOpen ? "▲" : "▼"}</span>
          </button>

          {/* Desktop filters (always visible) + Mobile filters (collapsible) */}
          <div className={`store-filters__controls ${isFiltersOpen ? "store-filters__controls--open" : ""}`}>
            {/* Platform Filter */}
            <div className="store-filters__group">
              <label className="store-filters__label">PLATFORM</label>
              <div className="store-filters__options">
                {(["all", "ios", "macos", "both"] as PlatformFilter[]).map((option) => (
                  <button
                    key={option}
                    className={`store-filters__btn ${platformFilter === option ? "store-filters__btn--active" : ""}`}
                    onClick={() => setPlatformFilter(option)}
                  >
                    {option === "all" ? "All" : option === "ios" ? "iOS" : option === "macos" ? "macOS" : "Both"}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="store-filters__group">
              <label className="store-filters__label">PRICE</label>
              <div className="store-filters__options">
                {(["all", "free", "paid"] as PriceFilter[]).map((option) => (
                  <button
                    key={option}
                    className={`store-filters__btn ${priceFilter === option ? "store-filters__btn--active" : ""}`}
                    onClick={() => setPriceFilter(option)}
                  >
                    {option === "all" ? "All" : option === "free" ? "Free" : "Paid"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sort dropdown */}
          <div className="store-filters__sort">
            <label className="store-filters__label">SORT BY</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="store-filters__select"
            >
              {showFeaturedSort && <option value="featured">Featured</option>}
              <option value="newest">Newest</option>
              <option value="recent">Recently Updated</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name A-Z</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Active filters & clear */}
        {activeFilterCount > 0 && (
          <div className="store-filters__active">
            {platformFilter !== "all" && (
              <span className="store-filters__tag">
                {platformFilter === "ios" ? "iOS only" : platformFilter === "macos" ? "macOS only" : "iOS + macOS"}
                <button onClick={() => setPlatformFilter("all")} aria-label="Remove platform filter">×</button>
              </span>
            )}
            {priceFilter !== "all" && (
              <span className="store-filters__tag">
                {priceFilter === "free" ? "Free apps" : "Paid apps"}
                <button onClick={() => setPriceFilter("all")} aria-label="Remove price filter">×</button>
              </span>
            )}
            <button 
              className="store-filters__clear"
              onClick={() => {
                setPlatformFilter("all");
                setPriceFilter("all");
              }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="store-section__results">
        <span className="store-section__count">
          {filteredAndSortedApps.length} {filteredAndSortedApps.length === 1 ? "app" : "apps"}
          {activeFilterCount > 0 && ` matching filters`}
        </span>
      </div>

      {/* Apps Grid */}
      {filteredAndSortedApps.length === 0 ? (
        <div className="store-empty">
          <p>No apps match your filters.</p>
          <button 
            className="store-empty__reset"
            onClick={() => {
              setPlatformFilter("all");
              setPriceFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="store-grid" key={`${platformFilter}-${priceFilter}-${sortBy}`}>
          {filteredAndSortedApps.map((app, i) => (
            <AppCard key={app.id} app={app} index={i} />
          ))}
        </div>
      )}
    </>
  );
}
