"use client";

import { useEffect, useRef } from "react";
import { getSession } from "@/lib/auth-client";

/**
 * SessionRefresh - Keeps the session alive by periodically refreshing it
 * 
 * This component runs in the background and:
 * 1. Refreshes the session every 10 minutes
 * 2. Also refreshes on user activity (mouse/keyboard) after being idle
 * 3. Prevents session timeout during active use
 */
export function SessionRefresh({
  refreshInterval = 10 * 60 * 1000, // 10 minutes default
  idleThreshold = 5 * 60 * 1000,   // 5 minutes idle before activity-based refresh
}: {
  refreshInterval?: number;
  idleThreshold?: number;
}) {
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    // Track user activity
    const updateActivity = () => {
      const now = Date.now();
      const wasIdle = now - lastActivityRef.current > idleThreshold;
      lastActivityRef.current = now;

      // If user was idle and is now active, refresh session
      if (wasIdle && now - lastRefreshRef.current > idleThreshold) {
        refreshSession();
      }
    };

    // Refresh session
    const refreshSession = async () => {
      try {
        await getSession();
        lastRefreshRef.current = Date.now();
        console.log("[SessionRefresh] Session refreshed");
      } catch (error) {
        console.error("[SessionRefresh] Failed to refresh session:", error);
      }
    };

    // Set up periodic refresh
    const intervalId = setInterval(() => {
      refreshSession();
    }, refreshInterval);

    // Set up activity listeners
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Initial refresh
    refreshSession();

    // Cleanup
    return () => {
      clearInterval(intervalId);
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [refreshInterval, idleThreshold]);

  // This component renders nothing
  return null;
}
