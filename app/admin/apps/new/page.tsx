import { Metadata } from "next";
import Link from "next/link";
import { AppForm } from "./app-form";

export const metadata: Metadata = {
  title: "New App — Admin — ISOLATED.TECH",
};

export default function NewAppPage() {
  return (
    <>
      <header className="admin-header">
        <a href="/admin/apps" className="app-page__back">
          ← BACK TO APPS
        </a>
        <h1 className="admin-header__title">New App</h1>
        <p className="admin-header__subtitle">
          Add a new app to your store
        </p>
      </header>

      <div style={{ maxWidth: "700px" }}>
        <AppForm />
      </div>
    </>
  );
}
