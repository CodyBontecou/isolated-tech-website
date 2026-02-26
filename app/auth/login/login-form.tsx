"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

interface LoginFormProps {
  redirect?: string;
}

export function LoginForm({ redirect }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await authClient.signIn.magicLink({
        email,
        callbackURL: redirect || "/dashboard",
      });

      if (authError) {
        setError(authError.message || "Failed to send magic link. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-message auth-message--info">
        <strong>CHECK YOUR EMAIL</strong>
        <br />
        <br />
        We sent a magic link to <strong>{email}</strong>. Click the link in the
        email to sign in.
        <br />
        <br />
        <button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => {
            setSent(false);
            setEmail("");
          }}
          style={{ marginTop: "1rem" }}
        >
          USE A DIFFERENT EMAIL
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {error && <div className="auth-message auth-message--error">{error}</div>}

      <input
        type="email"
        className="auth-input"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        autoComplete="email"
        autoFocus
      />

      <button type="submit" className="auth-btn" disabled={isLoading}>
        {isLoading ? "SENDING..." : "SEND MAGIC LINK"}
      </button>
    </form>
  );
}
