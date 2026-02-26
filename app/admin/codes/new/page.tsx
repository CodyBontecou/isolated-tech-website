import { Metadata } from "next";
import Link from "next/link";
import { CodeForm } from "./code-form";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "New Discount Code — Admin — ISOLATED.TECH",
};

async function getApps(): Promise<{ id: string; name: string }[]> {
  const env = getEnv();
  return query<{ id: string; name: string }>(
    `SELECT id, name FROM apps ORDER BY name ASC`,
    [],
    env
  );
}

export default async function NewCodePage() {
  const apps = await getApps();

  return (
    <>
      <header className="admin-header">
        <a href="/admin/codes" className="app-page__back">
          ← BACK TO CODES
        </a>
        <h1 className="admin-header__title">New Discount Code</h1>
        <p className="admin-header__subtitle">
          Create a promotional code for your apps
        </p>
      </header>

      <div style={{ maxWidth: "500px" }}>
        <CodeForm apps={apps} />
      </div>
    </>
  );
}
