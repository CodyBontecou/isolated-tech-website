import type { Review, AppStoreReview, UnifiedReview, ReviewStats, CombinedReviewStats } from "./types";

export function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "star-rating--sm" : size === "lg" ? "star-rating--lg" : "";
  return (
    <div className={`star-rating ${sizeClass}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star-rating__star ${star <= rating ? "star-rating__star--filled" : ""}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? "s" : ""} ago`;
}

function SourcePill({ source, appStoreUrl }: { source: "site" | "app_store"; appStoreUrl?: string | null }) {
  const isAppStore = source === "app_store";
  
  const content = isAppStore ? (
    <>
      <svg className="review-card__source-icon" viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      App Store
    </>
  ) : (
    "Verified Purchase"
  );
  
  // Link App Store reviews to the actual App Store
  if (isAppStore && appStoreUrl) {
    // Construct reviews URL from app store URL
    const reviewsUrl = appStoreUrl.includes("?") 
      ? `${appStoreUrl}&see-all=reviews`
      : `${appStoreUrl}?see-all=reviews`;
    
    return (
      <a 
        href={reviewsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`review-card__source review-card__source--app-store review-card__source--link`}
        title="View on App Store"
      >
        {content}
      </a>
    );
  }
  
  return (
    <span 
      className={`review-card__source ${isAppStore ? "review-card__source--app-store" : "review-card__source--site"}`}
      title={isAppStore ? "Review from the App Store" : "Review from this site"}
    >
      {content}
    </span>
  );
}

export function ReviewCard({ review, appStoreUrl }: { review: UnifiedReview; appStoreUrl?: string | null }) {
  return (
    <article className="review-card">
      <header className="review-card__header">
        <div className="review-card__header-left">
          <StarRating rating={review.rating} size="sm" />
          <SourcePill source={review.source} appStoreUrl={appStoreUrl} />
        </div>
        <time className="review-card__date" dateTime={review.created_at}>
          {formatRelativeTime(review.created_at)}
        </time>
      </header>
      {review.title && <h4 className="review-card__title">{review.title}</h4>}
      {review.body && <p className="review-card__body">{review.body}</p>}
      <footer className="review-card__footer">
        <div className="review-card__author">
          {review.author_image ? (
            <img 
              src={review.author_image} 
              alt="" 
              className="review-card__avatar"
            />
          ) : (
            <span className="review-card__avatar review-card__avatar--placeholder">
              {(review.author_name || "A")[0].toUpperCase()}
            </span>
          )}
          <span className="review-card__name">{review.author_name || "Anonymous"}</span>
          {review.territory && (
            <span className="review-card__territory">{review.territory}</span>
          )}
        </div>
      </footer>
    </article>
  );
}

/**
 * Convert site reviews and App Store reviews into a unified format for display
 */
export function unifyReviews(
  siteReviews: Review[],
  appStoreReviews: AppStoreReview[]
): UnifiedReview[] {
  const unified: UnifiedReview[] = [];

  // Add site reviews
  for (const r of siteReviews) {
    unified.push({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      created_at: r.created_at,
      author_name: r.user_name,
      author_image: r.user_image,
      source: "site",
    });
  }

  // Add App Store reviews
  for (const r of appStoreReviews) {
    unified.push({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      created_at: r.review_created_at,
      author_name: r.reviewer_nickname,
      author_image: null,
      source: "app_store",
      territory: r.territory,
      app_version: r.app_store_version,
    });
  }

  // Sort by date, most recent first
  unified.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return unified;
}

interface ReviewsSectionProps {
  reviews: Review[];
  appStoreReviews?: AppStoreReview[];
  stats: ReviewStats | CombinedReviewStats | null;
  appStoreUrl?: string | null;
}

export function ReviewsSection({ reviews, appStoreReviews = [], stats, appStoreUrl }: ReviewsSectionProps) {
  const unifiedReviews = unifyReviews(reviews, appStoreReviews);
  
  if (!unifiedReviews.length) return null;

  const avgRating = stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0;
  const totalCount = stats?.review_count ?? unifiedReviews.length;
  
  // Check if we have combined stats with source breakdown
  const hasCombinedStats = stats && 'site_count' in stats;
  const siteCount = hasCombinedStats ? (stats as CombinedReviewStats).site_count : reviews.length;
  const appStoreCount = hasCombinedStats ? (stats as CombinedReviewStats).app_store_count : appStoreReviews.length;

  return (
    <section className="reviews-section">
      <header className="reviews-section__header">
        <h2 className="reviews-section__title">REVIEWS</h2>
        {stats && totalCount > 0 && (
          <div className="reviews-section__summary">
            <span className="reviews-section__avg">{avgRating.toFixed(1)}</span>
            <StarRating rating={Math.round(avgRating)} size="md" />
            <span className="reviews-section__count">
              {totalCount} review{totalCount !== 1 ? "s" : ""}
            </span>
            {siteCount > 0 && appStoreCount > 0 && (
              <span className="reviews-section__breakdown">
                ({siteCount} site · {appStoreCount} App Store)
              </span>
            )}
          </div>
        )}
      </header>
      <div className="reviews-section__list">
        {unifiedReviews.map((review) => (
          <ReviewCard 
            key={`${review.source}-${review.id}`} 
            review={review} 
            appStoreUrl={review.source === "app_store" ? appStoreUrl : undefined}
          />
        ))}
      </div>
    </section>
  );
}
