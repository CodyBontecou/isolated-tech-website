import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Roadmap — ISOLATED.TECH",
  description: "See what we're building next. Public roadmap powered by community feedback.",
};

interface FeatureRequest {
  id: string;
  app_id: string | null;
  app_name: string | null;
  app_icon: string | null;
  type: "feature" | "bug" | "improvement";
  title: string;
  body: string;
  status: "open" | "planned" | "in_progress" | "completed" | "closed";
  vote_count: number;
  comment_count: number;
  priority: number;
}

async function getRoadmapItems(): Promise<{
  planned: FeatureRequest[];
  inProgress: FeatureRequest[];
  completed: FeatureRequest[];
}> {
  const env = getEnv();
  if (!env?.DB) {
    return { planned: [], inProgress: [], completed: [] };
  }

  const items = await query<FeatureRequest>(
    `SELECT 
       fr.id,
       fr.app_id,
       a.name as app_name,
       a.icon_url as app_icon,
       fr.type,
       fr.title,
       fr.body,
       fr.status,
       fr.vote_count,
       fr.comment_count,
       fr.priority
     FROM feature_requests fr
     LEFT JOIN apps a ON fr.app_id = a.id
     WHERE fr.status IN ('planned', 'in_progress', 'completed')
     ORDER BY fr.priority DESC, fr.vote_count DESC`,
    [],
    env
  );

  return {
    planned: items.filter((i) => i.status === "planned"),
    inProgress: items.filter((i) => i.status === "in_progress"),
    completed: items.filter((i) => i.status === "completed").slice(0, 10), // Last 10 completed
  };
}

function TypeIcon({ type }: { type: "feature" | "bug" | "improvement" }) {
  const icons = {
    feature: "✨",
    bug: "🐛",
    improvement: "⚡",
  };
  return <span>{icons[type]}</span>;
}

function RoadmapCard({ item }: { item: FeatureRequest }) {
  return (
    <Link href={`/feedback/${item.id}`} className="roadmap-card">
      <div className="roadmap-card__header">
        <TypeIcon type={item.type} />
        {item.app_name && (
          <span className="roadmap-card__app">
            {item.app_icon && (
              <img src={item.app_icon} alt="" className="roadmap-card__app-icon" />
            )}
            {item.app_name}
          </span>
        )}
      </div>
      <h3 className="roadmap-card__title">{item.title}</h3>
      <div className="roadmap-card__meta">
        <span className="roadmap-card__votes">▲ {item.vote_count}</span>
        <span className="roadmap-card__comments">💬 {item.comment_count}</span>
      </div>
    </Link>
  );
}

function RoadmapColumn({
  title,
  items,
  color,
  emptyText,
}: {
  title: string;
  items: FeatureRequest[];
  color: string;
  emptyText: string;
}) {
  return (
    <div className="roadmap-column">
      <div className="roadmap-column__header" style={{ borderColor: color }}>
        <h2 className="roadmap-column__title">{title}</h2>
        <span className="roadmap-column__count" style={{ background: color }}>
          {items.length}
        </span>
      </div>
      <div className="roadmap-column__list">
        {items.length === 0 ? (
          <p className="roadmap-column__empty">{emptyText}</p>
        ) : (
          items.map((item) => <RoadmapCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

export default async function RoadmapPage() {
  const env = getEnv();
  const [user, { planned, inProgress, completed }] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getRoadmapItems(),
  ]);

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/#apps">APPS</a>
          <a href="/feedback">FEEDBACK</a>
          <a href="/roadmap" style={{ opacity: 1 }}>ROADMAP</a>
          {user ? (
            <>
              {user.isAdmin && <a href="/admin">ADMIN</a>}
              <a href="/dashboard">DASHBOARD</a>
              <SignOutButton />
            </>
          ) : (
            <a href="/auth/login">SIGN IN</a>
          )}
        </div>
      </nav>

      {/* HEADER */}
      <header className="roadmap-header">
        <div className="roadmap-header__content">
          <h1 className="roadmap-header__title">Public Roadmap</h1>
          <p className="roadmap-header__subtitle">
            See what we're working on. This roadmap is shaped by community feedback and votes.
            <Link href="/feedback" className="roadmap-header__link">Submit your ideas →</Link>
          </p>
        </div>
      </header>

      {/* ROADMAP BOARD */}
      <main className="roadmap-board">
        <RoadmapColumn
          title="📋 PLANNED"
          items={planned}
          color="#f59e0b"
          emptyText="Nothing planned yet. Vote on feedback to shape the roadmap!"
        />
        <RoadmapColumn
          title="🚧 IN PROGRESS"
          items={inProgress}
          color="#8b5cf6"
          emptyText="Nothing in progress right now."
        />
        <RoadmapColumn
          title="✅ COMPLETED"
          items={completed}
          color="#22c55e"
          emptyText="No completed items yet."
        />
      </main>

      {/* FOOTER */}
      <footer className="store-footer">
        <div className="store-footer__brand">
          <span className="store-footer__logo">
            ISOLATED<span className="dot">.</span>TECH
          </span>
          <span className="store-footer__tagline">Software that ships.</span>
        </div>
        <div className="store-footer__links">
          <a href="/feedback">FEEDBACK</a>
          <a href="/roadmap">ROADMAP</a>
          <a href="/help">HELP</a>
          <Link href="/privacy">PRIVACY</Link>
          <Link href="/terms">TERMS</Link>
        </div>
        <div className="store-footer__copy">
          © 2026 ISOLATED.TECH
        </div>
      </footer>
    </>
  );
}
