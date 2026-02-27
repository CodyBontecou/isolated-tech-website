"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FeatureRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  user_image: string | null;
  app_id: string | null;
  app_name: string | null;
  app_slug: string | null;
  app_icon: string | null;
  type: "feature" | "bug" | "improvement";
  title: string;
  body: string;
  status: "open" | "planned" | "in_progress" | "completed" | "closed";
  vote_count: number;
  comment_count: number;
  created_at: string;
  user_voted: number;
}

interface App {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
}

type TypeFilter = "all" | "feature" | "bug" | "improvement";
type StatusFilter = "all" | "open" | "planned" | "in_progress" | "completed";
type SortOption = "votes" | "newest" | "comments";

interface FeedbackFiltersProps {
  requests: FeatureRequest[];
  apps: App[];
  userId?: string;
  isLoggedIn: boolean;
  initialHasMore: boolean;
  initialCursor: string | null;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TypeBadge({ type }: { type: "feature" | "bug" | "improvement" }) {
  const config = {
    feature: { label: "FEATURE", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.1)" },
    bug: { label: "🐛 BUG", color: "#f87171", bg: "rgba(248, 113, 113, 0.1)" },
    improvement: { label: "IMPROVE", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
  };
  const { label, color, bg } = config[type];

  return (
    <span
      className="feedback-type-badge"
      style={{ background: bg, color, borderColor: `${color}30` }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "OPEN", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    planned: { label: "PLANNED", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    in_progress: { label: "IN PROGRESS", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
    completed: { label: "COMPLETED", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
    closed: { label: "CLOSED", color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)" },
  };
  const { label, color, bg } = config[status] || config.open;

  return (
    <span
      className="feedback-status-badge"
      style={{ background: bg, color, borderColor: `${color}30` }}
    >
      {label}
    </span>
  );
}

function VoteButton({ 
  request, 
  isLoggedIn, 
  onVote 
}: { 
  request: FeatureRequest; 
  isLoggedIn: boolean;
  onVote: (id: string, currentVoted: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const hasVoted = request.user_voted === 1;

  const handleVote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
      window.location.href = `/auth/login?redirect=/feedback`;
      return;
    }

    startTransition(() => {
      onVote(request.id, hasVoted);
    });
  };

  return (
    <button
      onClick={handleVote}
      disabled={isPending}
      className={`feedback-vote-btn ${hasVoted ? "feedback-vote-btn--voted" : ""}`}
      aria-label={hasVoted ? "Remove vote" : "Upvote"}
    >
      <span className="feedback-vote-btn__arrow">▲</span>
      <span className="feedback-vote-btn__count">{request.vote_count}</span>
    </button>
  );
}

function FeedbackCard({ 
  request, 
  isLoggedIn,
  onVote,
}: { 
  request: FeatureRequest; 
  isLoggedIn: boolean;
  onVote: (id: string, currentVoted: boolean) => void;
}) {
  return (
    <div className="feedback-card">
      <VoteButton request={request} isLoggedIn={isLoggedIn} onVote={onVote} />
      
      <Link href={`/feedback/${request.id}`} className="feedback-card__content">
        <div className="feedback-card__header">
          <div className="feedback-card__badges">
            <TypeBadge type={request.type} />
            <StatusBadge status={request.status} />
          </div>
          {request.app_name && (
            <div className="feedback-card__app">
              {request.app_icon && (
                <img src={request.app_icon} alt="" className="feedback-card__app-icon" />
              )}
              <span>{request.app_name}</span>
            </div>
          )}
        </div>

        <h3 className="feedback-card__title">{request.title}</h3>
        <p className="feedback-card__body">
          {request.body.length > 150 ? `${request.body.slice(0, 150)}...` : request.body}
        </p>

        <div className="feedback-card__footer">
          <div className="feedback-card__author">
            {request.user_image ? (
              <img src={request.user_image} alt="" className="feedback-card__avatar" />
            ) : (
              <div className="feedback-card__avatar feedback-card__avatar--placeholder">
                {(request.user_name || "A")[0].toUpperCase()}
              </div>
            )}
            <span>{request.user_name || "Anonymous"}</span>
          </div>
          <div className="feedback-card__meta">
            <span className="feedback-card__comments">
              💬 {request.comment_count}
            </span>
            <span className="feedback-card__time">
              {formatTimeAgo(request.created_at)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function FeedbackFilters({ 
  requests: initialRequests, 
  apps, 
  userId, 
  isLoggedIn,
  initialHasMore,
  initialCursor,
}: FeedbackFiltersProps) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [appFilter, setAppFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination state
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleVote = async (requestId: string, currentVoted: boolean) => {
    // Optimistic update
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              vote_count: currentVoted ? r.vote_count - 1 : r.vote_count + 1,
              user_voted: currentVoted ? 0 : 1,
            }
          : r
      )
    );

    try {
      const res = await fetch("/api/feedback/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      if (!res.ok) {
        // Revert on error
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? {
                  ...r,
                  vote_count: currentVoted ? r.vote_count + 1 : r.vote_count - 1,
                  user_voted: currentVoted ? 1 : 0,
                }
              : r
          )
        );
      }
    } catch {
      // Revert on error
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                vote_count: currentVoted ? r.vote_count + 1 : r.vote_count - 1,
                user_voted: currentVoted ? 1 : 0,
              }
            : r
        )
      );
    }
  };

  const handleLoadMore = async () => {
    if (!cursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        cursor,
        sort: sortBy,
      });
      
      const res = await fetch(`/api/feedback?${params}`);
      if (!res.ok) throw new Error("Failed to load more");

      const data = await res.json();
      
      setRequests((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Reset pagination when sort changes
  const handleSortChange = async (newSort: SortOption) => {
    if (newSort === sortBy) return;
    
    setSortBy(newSort);
    
    // Fetch fresh data with new sort
    try {
      const res = await fetch(`/api/feedback?sort=${newSort}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.items);
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      }
    } catch (err) {
      console.error("Sort change error:", err);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = [...requests];

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // App filter
    if (appFilter !== "all") {
      filtered = filtered.filter((r) => r.app_id === appFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "votes":
          return b.vote_count - a.vote_count;
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "comments":
          return b.comment_count - a.comment_count;
        default:
          return 0;
      }
    });

    return filtered;
  }, [requests, typeFilter, statusFilter, appFilter, sortBy, searchQuery]);

  return (
    <>
      {/* FILTERS */}
      <div className="feedback-filters">
        <div className="feedback-filters__search">
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="feedback-filters__input"
          />
        </div>

        <div className="feedback-filters__row">
          {/* Type Filter */}
          <div className="feedback-filters__group">
            <label className="feedback-filters__label">TYPE</label>
            <div className="feedback-filters__options">
              {(["all", "feature", "bug", "improvement"] as TypeFilter[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTypeFilter(opt)}
                  className={`feedback-filters__btn ${typeFilter === opt ? "feedback-filters__btn--active" : ""}`}
                >
                  {opt === "all" ? "All" : opt === "bug" ? "🐛 Bugs" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="feedback-filters__group">
            <label className="feedback-filters__label">STATUS</label>
            <div className="feedback-filters__options">
              {(["all", "open", "planned", "in_progress", "completed"] as StatusFilter[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setStatusFilter(opt)}
                  className={`feedback-filters__btn ${statusFilter === opt ? "feedback-filters__btn--active" : ""}`}
                >
                  {opt === "all" ? "All" : opt === "in_progress" ? "In Progress" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* App Filter */}
          {apps.length > 1 && (
            <div className="feedback-filters__group">
              <label className="feedback-filters__label">APP</label>
              <select
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                className="feedback-filters__select"
              >
                <option value="all">All Apps</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="feedback-filters__group feedback-filters__group--sort">
            <label className="feedback-filters__label">SORT BY</label>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="feedback-filters__select"
            >
              <option value="votes">Most Voted</option>
              <option value="newest">Newest</option>
              <option value="comments">Most Discussed</option>
            </select>
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <div className="feedback-results">
        <span className="feedback-results__count">
          {filteredAndSorted.length} {filteredAndSorted.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* LIST */}
      {filteredAndSorted.length === 0 ? (
        <div className="feedback-empty">
          <p>No feedback matches your filters.</p>
          {isLoggedIn && (
            <Link href="/feedback/submit" className="feedback-empty__btn">
              Be the first to submit an idea
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="feedback-list">
            {filteredAndSorted.map((request) => (
              <FeedbackCard
                key={request.id}
                request={request}
                isLoggedIn={isLoggedIn}
                onVote={handleVote}
              />
            ))}
          </div>
          
          {/* Load More Button - only show when not filtering/searching */}
          {hasMore && !searchQuery && typeFilter === "all" && statusFilter === "all" && appFilter === "all" && (
            <div className="feedback-load-more">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="feedback-load-more__btn"
              >
                {isLoadingMore ? "LOADING..." : "LOAD MORE"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
