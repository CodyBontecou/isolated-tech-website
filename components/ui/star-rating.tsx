interface StarRatingProps {
  rating: number;
  count: number;
  compact?: boolean;
}

/**
 * Star rating display component
 * Compact mode shows single star with numeric rating
 * Full mode shows 5 stars filled based on rating
 */
export function StarRating({ rating, count, compact = true }: StarRatingProps) {
  if (count === 0) return null;
  
  const roundedRating = Math.round(rating * 10) / 10;

  if (compact) {
    return (
      <div
        className="star-rating-compact"
        aria-label={`${roundedRating} out of 5 stars from ${count} reviews`}
      >
        <span className="star-rating-compact__star">★</span>
        <span className="star-rating-compact__value">{roundedRating.toFixed(1)}</span>
      </div>
    );
  }

  // Full star display for detail pages
  const filledStars = Math.round(rating);
  return (
    <div className="star-rating" aria-label={`${roundedRating} out of 5 stars from ${count} reviews`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star-rating__star ${star <= filledStars ? "star-rating__star--filled" : ""}`}
        >
          ★
        </span>
      ))}
      <span className="star-rating__count">({count})</span>
    </div>
  );
}

/**
 * Compact star rating - alias for backwards compatibility
 */
export function StarRatingCompact({ rating, count }: { rating: number; count: number }) {
  return <StarRating rating={rating} count={count} compact={true} />;
}
