"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  newsletterSubscribed: boolean;
  providers: string[];
}

const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  apple: "Apple",
};

export function SettingsForm({ user }: { user: User }) {
  const [name, setName] = useState(user.name || "");
  const [newsletter, setNewsletter] = useState(user.newsletterSubscribed);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully." });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to update profile." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletter_subscribed: newsletter }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Preferences saved." });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save preferences." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsSaving(true);

    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.href = "/?deleted=1";
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to delete account." });
        setShowDeleteConfirm(false);
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
      setShowDeleteConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-form">
      {message && (
        <div
          className={`auth-message ${message.type === "success" ? "auth-message--success" : "auth-message--error"}`}
          style={{ marginBottom: "2rem" }}
        >
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 className="dashboard__section-title">PROFILE</h2>

        <div className="settings-group">
          <label className="settings-label">DISPLAY NAME</label>
          <input
            type="text"
            className="settings-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="settings-group">
          <label className="settings-label">EMAIL</label>
          <input
            type="email"
            className="settings-input"
            value={user.email}
            disabled
            style={{ opacity: 0.6, cursor: "not-allowed" }}
          />
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "0.55rem", lineHeight: 1.6 }}>
            Email cannot be changed.
          </p>
        </div>

        <button
          className="auth-btn"
          onClick={handleSaveProfile}
          disabled={isSaving}
          style={{ width: "auto" }}
        >
          {isSaving ? "SAVING..." : "SAVE PROFILE"}
        </button>
      </section>

      {/* Connected Accounts */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 className="dashboard__section-title">CONNECTED ACCOUNTS</h2>

        {user.providers.length > 0 ? (
          <div style={{ marginBottom: "1rem" }}>
            {user.providers.map((provider) => (
              <div
                key={provider}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "var(--gray-dark)",
                  border: "var(--border)",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  {PROVIDER_NAMES[provider] || provider}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#4ade80", letterSpacing: "0.06em" }}>CONNECTED</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1rem", lineHeight: 1.7 }}>
            No accounts connected. Sign in with a provider to link it.
          </p>
        )}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {!user.providers.includes("github") && (
            <a href="/auth/github?link=1" className="auth-oauth-btn" style={{ flex: "0 1 auto" }}>
              + LINK GITHUB
            </a>
          )}
          {!user.providers.includes("google") && (
            <a href="/auth/google?link=1" className="auth-oauth-btn" style={{ flex: "0 1 auto" }}>
              + LINK GOOGLE
            </a>
          )}
          {!user.providers.includes("apple") && (
            <a href="/auth/apple?link=1" className="auth-oauth-btn" style={{ flex: "0 1 auto" }}>
              + LINK APPLE
            </a>
          )}
        </div>
      </section>

      {/* Email Preferences */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 className="dashboard__section-title">EMAIL PREFERENCES</h2>

        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          <span>Receive newsletter and product updates</span>
        </label>

        <button
          className="auth-btn auth-btn--outline"
          onClick={handleSavePreferences}
          disabled={isSaving}
          style={{ width: "auto", marginTop: "1rem" }}
        >
          {isSaving ? "SAVING..." : "SAVE PREFERENCES"}
        </button>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="dashboard__section-title" style={{ color: "#f87171" }}>
          DANGER ZONE
        </h2>

        {!showDeleteConfirm ? (
          <>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1rem", lineHeight: 1.75 }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              className="auth-btn"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: "auto",
                background: "transparent",
                color: "#f87171",
                border: "1px solid #f87171",
              }}
            >
              DELETE ACCOUNT
            </button>
          </>
        ) : (
          <div
            style={{
              padding: "1.5rem",
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid #f87171",
            }}
          >
            <p style={{ color: "#f87171", fontSize: "0.92rem", marginBottom: "1rem", lineHeight: 1.6 }}>
              Are you sure? This will permanently delete:
            </p>
            <ul style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginLeft: "1.5rem", marginBottom: "1rem", lineHeight: 1.75 }}>
              <li>Your account and profile</li>
              <li>All your reviews</li>
              <li>Access to purchased apps (purchase records kept for tax purposes)</li>
            </ul>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="auth-btn"
                onClick={handleDeleteAccount}
                disabled={isSaving}
                style={{ background: "#f87171", borderColor: "#f87171" }}
              >
                {isSaving ? "DELETING..." : "YES, DELETE"}
              </button>
              <button
                className="auth-btn auth-btn--outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSaving}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
