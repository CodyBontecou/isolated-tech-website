import { Metadata } from "next";
import { ImportForm } from "./import-form";

export const metadata: Metadata = {
  title: "Import Subscribers — Admin — ISOLATED.TECH",
};

export default function ImportSubscribersPage() {
  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Import Subscribers</h1>
        <p className="admin-header__subtitle">
          Add email subscribers from Gumroad or other sources
        </p>
      </header>

      <ImportForm />
    </>
  );
}
