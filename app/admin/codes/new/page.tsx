import { Metadata } from "next";
import Link from "next/link";
import { CodeForm } from "./code-form";

export const metadata: Metadata = {
  title: "New Discount Code — Admin — ISOLATED.TECH",
};

// Mock apps for selector
const APPS = [
  { id: "app_voxboard_001", name: "Voxboard" },
  { id: "app_syncmd_001", name: "sync.md" },
  { id: "app_healthmd_001", name: "health.md" },
  { id: "app_imghost_001", name: "imghost" },
];

export default function NewCodePage() {
  return (
    <>
      <header className="admin-header">
        <Link href="/admin/codes" className="app-page__back">
          ← BACK TO CODES
        </Link>
        <h1 className="admin-header__title">New Discount Code</h1>
        <p className="admin-header__subtitle">
          Create a promotional code for your apps
        </p>
      </header>

      <div style={{ maxWidth: "500px" }}>
        <CodeForm apps={APPS} />
      </div>
    </>
  );
}
