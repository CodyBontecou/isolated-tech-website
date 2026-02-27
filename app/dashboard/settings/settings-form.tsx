"use client";

import { useState } from "react";
import { useTheme } from "@/components/theme-provider";

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

type Theme = "light" | "dark" | "system";

export function SettingsForm({ user }: { user: User }) {
  const { theme, setTheme } = useTheme();
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
          <p style={{ fontSize: "0.7rem", color: "var(--gray)", marginTop: "0.5rem" }}>
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
                <span style={{ fontSize: "0.7rem", color: "#4ade80" }}>CONNECTED</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--gray)", fontSize: "0.85rem", marginBottom: "1rem" }}>
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

      {/* Appearance */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 className="dashboard__section-title">APPEARANCE</h2>

        <p style={{ color: "var(--gray)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Choose how the site looks to you. Select a theme or use your system setting.
        </p>

        <div className="theme-selector">
          <button
            type="button"
            className={`theme-option ${theme === "system" ? "theme-option--active" : ""}`}
            onClick={() => setTheme("system")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>SYSTEM</span>
          </button>
          <button
            type="button"
            className={`theme-option ${theme === "light" ? "theme-option--active" : ""}`}
            onClick={() => setTheme("light")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>LIGHT</span>
          </button>
          <button
            type="button"
            className={`theme-option ${theme === "dark" ? "theme-option--active" : ""}`}
            onClick={() => setTheme("dark")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>DARK</span>
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="dashboard__section-title" style={{ color: "#f87171" }}>
          DANGER ZONE
        </h2>

        {!showDeleteConfirm ? (
          <>
            <p style={{ color: "var(--gray)", fontSize: "0.85rem", marginBottom: "1rem" }}>
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
            <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Are you sure? This will permanently delete:
            </p>
            <ul style={{ color: "var(--gray)", fontSize: "0.8rem", marginLeft: "1.5rem", marginBottom: "1rem" }}>
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
