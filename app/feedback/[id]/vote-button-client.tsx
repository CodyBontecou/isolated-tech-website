"use client";

import { useState, useTransition } from "react";

interface Props {
  requestId: string;
  initialVoteCount: number;
  initialVoted: boolean;
  isLoggedIn: boolean;
}

export function VoteButtonClient({ requestId, initialVoteCount, initialVoted, isLoggedIn }: Props) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialVoted);
  const [isPending, startTransition] = useTransition();

  const handleVote = () => {
    if (!isLoggedIn) {
      window.location.href = `/auth/login?redirect=/feedback/${requestId}`;
      return;
    }

    // Optimistic update
    const newVoted = !hasVoted;
    setHasVoted(newVoted);
    setVoteCount((c) => (newVoted ? c + 1 : c - 1));

    startTransition(async () => {
      try {
        const res = await fetch("/api/feedback/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId }),
        });

        if (!res.ok) {
          // Revert on error
          setHasVoted(!newVoted);
          setVoteCount((c) => (newVoted ? c - 1 : c + 1));
        }
      } catch {
        // Revert on error
        setHasVoted(!newVoted);
        setVoteCount((c) => (newVoted ? c - 1 : c + 1));
      }
    });
  };

  return (
    <button
      onClick={handleVote}
      disabled={isPending}
      className={`feedback-vote-btn feedback-vote-btn--large ${hasVoted ? "feedback-vote-btn--voted" : ""}`}
      aria-label={hasVoted ? "Remove vote" : "Upvote"}
    >
      <span className="feedback-vote-btn__arrow">▲</span>
      <span className="feedback-vote-btn__count">{voteCount}</span>
      <span className="feedback-vote-btn__label">{hasVoted ? "VOTED" : "UPVOTE"}</span>
    </button>
  );
}
