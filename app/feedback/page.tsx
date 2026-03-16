import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { FeedbackFilters } from "./components/feedback-filters";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Feedback — ISOLATED.TECH",
  description: "Vote on features, report bugs, and help shape the future of our apps.",
};

const PAGE_SIZE = 20;

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

interface FeedbackStats {
  total: number;
  open: number;
  planned: number;
  in_progress: number;
}

async function getFeatureRequests(
  userId?: string,
  appFilter?: string
): Promise<{ items: FeatureRequest[]; hasMore: boolean; nextCursor: string | null }> {
  const env = getEnv();
  if (!env?.DB) return { items: [], hasMore: false, nextCursor: null };

  const hasAppFilter = !!appFilter;
  const appWhere = hasAppFilter ? " AND (fr.app_id = ? OR a.slug = ?)" : "";
  const params: unknown[] = [userId || ""];

  if (hasAppFilter) {
    params.push(appFilter, appFilter);
  }

  params.push(PAGE_SIZE + 1);

  const items = await query<FeatureRequest>(
    `SELECT 
       fr.id,
       fr.user_id,
       u.name as user_name,
       u.image as user_image,
       fr.app_id,
       a.name as app_name,
       a.slug as app_slug,
       a.icon_url as app_icon,
       fr.type,
       fr.title,
       fr.body,
       fr.status,
       fr.vote_count,
       fr.comment_count,
       fr.created_at,
       COALESCE((SELECT 1 FROM feature_votes fv WHERE fv.request_id = fr.id AND fv.user_id = ?), 0) as user_voted
     FROM feature_requests fr
     JOIN "user" u ON fr.user_id = u.id
     LEFT JOIN apps a ON fr.app_id = a.id
     WHERE fr.status != 'closed'${appWhere}
     ORDER BY fr.vote_count DESC, fr.created_at DESC
     LIMIT ?`,
    params,
    env
  );

  const hasMore = items.length > PAGE_SIZE;
  const results = hasMore ? items.slice(0, PAGE_SIZE) : items;
  const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;

  return { items: results, hasMore, nextCursor };
}

async function getFeedbackStats(appFilter?: string): Promise<FeedbackStats> {
  const env = getEnv();
  if (!env?.DB) return { total: 0, open: 0, planned: 0, in_progress: 0 };

  const hasAppFilter = !!appFilter;
  const appJoin = hasAppFilter ? " LEFT JOIN apps a ON fr.app_id = a.id" : "";
  const appWhere = hasAppFilter ? " AND (fr.app_id = ? OR a.slug = ?)" : "";

  const stats = await query<{ status: string; count: number }>(
    `SELECT fr.status as status, COUNT(*) as count
     FROM feature_requests fr${appJoin}
     WHERE fr.status != 'closed'${appWhere}
     GROUP BY fr.status`,
    hasAppFilter ? [appFilter, appFilter] : [],
    env
  );

  const result: FeedbackStats = { total: 0, open: 0, planned: 0, in_progress: 0 };
  for (const row of stats) {
    result.total += row.count;
    if (row.status === "open") result.open = row.count;
    if (row.status === "planned") result.planned = row.count;
    if (row.status === "in_progress") result.in_progress = row.count;
  }
  return result;
}

async function getApps(): Promise<{ id: string; name: string; slug: string; icon_url: string | null }[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query(
    `SELECT id, name, slug, icon_url FROM apps WHERE is_published = 1 ORDER BY name`,
    [],
    env
  );
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;
  const appFilter = searchParams.app?.trim() || undefined;

  const [feedbackData, apps, stats] = await Promise.all([
    getFeatureRequests(user?.id, appFilter),
    getApps(),
    getFeedbackStats(appFilter),
  ]);

  const initialAppFilter = appFilter
    ? (apps.find((app) => app.id === appFilter || app.slug === appFilter)?.id ?? "all")
    : "all";

  const submitHref = appFilter
    ? `/feedback/submit?app=${encodeURIComponent(appFilter)}`
    : "/feedback/submit";

  const { items: requests, hasMore, nextCursor } = feedbackData;

  return (
    <>
      {/* NAV */}
      <SiteNav user={user} activePage="feedback" />

      {/* HEADER */}
      <header className="feedback-header">
        <div className="feedback-header__content">
          <h1 className="feedback-header__title">
            Ideas + <span className="feedback-header__bug">🪲</span> Bugs
          </h1>
          <p className="feedback-header__subtitle">
            Vote on features, report bugs, and help shape the future of our apps.
            Your feedback drives our roadmap.
          </p>
        </div>
        
        <div className="feedback-header__actions">
          {user ? (
            <Link href={submitHref} className="feedback-submit-btn">
              + SUBMIT IDEA
            </Link>
          ) : (
            <a href={`/auth/login?redirect=${encodeURIComponent(submitHref)}`} className="feedback-submit-btn">
              SIGN IN TO SUBMIT
            </a>
          )}
        </div>
      </header>

      {/* STATS */}
      <div className="feedback-stats">
        <div className="feedback-stats__item">
          <span className="feedback-stats__number">{stats.total}</span>
          <span className="feedback-stats__label">TOTAL</span>
        </div>
        <div className="feedback-stats__divider" />
        <div className="feedback-stats__item">
          <span className="feedback-stats__number feedback-stats__number--open">{stats.open}</span>
          <span className="feedback-stats__label">OPEN</span>
        </div>
        <div className="feedback-stats__divider" />
        <div className="feedback-stats__item">
          <span className="feedback-stats__number feedback-stats__number--planned">{stats.planned}</span>
          <span className="feedback-stats__label">PLANNED</span>
        </div>
        <div className="feedback-stats__divider" />
        <div className="feedback-stats__item">
          <span className="feedback-stats__number feedback-stats__number--progress">{stats.in_progress}</span>
          <span className="feedback-stats__label">IN PROGRESS</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="feedback-main">
        <FeedbackFilters 
          requests={requests} 
          apps={apps} 
          userId={user?.id} 
          isLoggedIn={!!user}
          initialHasMore={hasMore}
          initialCursor={nextCursor}
          initialAppFilter={initialAppFilter}
        />
      </main>

      {/* FOOTER */}
      <SiteFooter />
    </>
  );
}
