import type { Review, ReviewStats } from "./types";

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

export function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="review-card">
      <header className="review-card__header">
        <StarRating rating={review.rating} size="sm" />
        <time className="review-card__date" dateTime={review.created_at}>
          {formatRelativeTime(review.created_at)}
        </time>
      </header>
      {review.title && <h4 className="review-card__title">{review.title}</h4>}
      {review.body && <p className="review-card__body">{review.body}</p>}
      <footer className="review-card__footer">
        <div className="review-card__author">
          {review.user_image ? (
            <img 
              src={review.user_image} 
              alt="" 
              className="review-card__avatar"
            />
          ) : (
            <span className="review-card__avatar review-card__avatar--placeholder">
              {(review.user_name || "A")[0].toUpperCase()}
            </span>
          )}
          <span className="review-card__name">{review.user_name || "Anonymous"}</span>
        </div>
      </footer>
    </article>
  );
}

export function ReviewsSection({ reviews, stats }: { reviews: Review[]; stats: ReviewStats | null }) {
  if (!reviews.length) return null;

  const avgRating = stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0;

  return (
    <section className="reviews-section">
      <header className="reviews-section__header">
        <h2 className="reviews-section__title">REVIEWS</h2>
        {stats && stats.review_count > 0 && (
          <div className="reviews-section__summary">
            <span className="reviews-section__avg">{avgRating.toFixed(1)}</span>
            <StarRating rating={Math.round(avgRating)} size="md" />
            <span className="reviews-section__count">
              {stats.review_count} review{stats.review_count !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </header>
      <div className="reviews-section__list">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}
