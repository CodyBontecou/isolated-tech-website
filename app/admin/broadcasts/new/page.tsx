import { Metadata } from "next";
import { BroadcastForm } from "./broadcast-form";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "New Broadcast — Admin — ISOLATED.TECH",
};

async function getSubscriberCount(): Promise<number> {
  const env = getEnv();
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM subscribers WHERE is_active = 1`
    ).first<{ count: number }>();
    return result?.count || 0;
  } catch {
    return 0;
  }
}

export default async function NewBroadcastPage() {
  const subscriberCount = await getSubscriberCount();

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">New Broadcast</h1>
        <p className="admin-header__subtitle">
          Send an email to {subscriberCount} active subscriber{subscriberCount !== 1 ? "s" : ""}
        </p>
      </header>

      <BroadcastForm subscriberCount={subscriberCount} />
    </>
  );
}
