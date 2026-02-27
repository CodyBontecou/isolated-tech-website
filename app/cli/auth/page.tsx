import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { queryOne } from "@/lib/db";
import { CLIAuthForm } from "./cli-auth-form";

export const metadata: Metadata = {
  title: "Authorize CLI — ISOLATED.TECH",
  description: "Authorize the isolated CLI to access your account.",
};

interface DeviceCode {
  id: string;
  user_code: string;
  status: string;
  expires_at: string;
}

export default async function CLIAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const env = getEnv();
  
  // Check if user is logged in
  const user = await getCurrentUser(env);
  
  if (!user) {
    // Redirect to login, then back here
    const redirectUrl = `/cli/auth${code ? `?code=${code}` : ""}`;
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`);
  }
  
  // If no code provided, show instructions
  if (!code) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <a href="/" className="auth-back-link">
            ← BACK TO HOME
          </a>
          
          <div className="auth-card__header">
            <div className="auth-card__logo">
              ISOLATED<span className="dot">.</span>TECH
            </div>
            <h1 className="auth-card__title">CLI Authorization</h1>
            <p className="auth-card__subtitle">
              Run <code style={{ 
                background: "rgba(255,255,255,0.1)", 
                padding: "2px 6px", 
                borderRadius: "4px",
                fontFamily: "monospace"
              }}>isolated login</code> in your terminal to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Validate the code
  const deviceCode = await queryOne<DeviceCode>(
    `SELECT id, user_code, status, expires_at
     FROM cli_device_codes
     WHERE user_code = ?`,
    [code],
    env
  );
  
  const isExpired = deviceCode && new Date(deviceCode.expires_at) < new Date();
  const isInvalid = !deviceCode || deviceCode.status !== "pending" || isExpired;
  
  if (isInvalid) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <a href="/" className="auth-back-link">
            ← BACK TO HOME
          </a>
          
          <div className="auth-card__header">
            <div className="auth-card__logo">
              ISOLATED<span className="dot">.</span>TECH
            </div>
            <h1 className="auth-card__title">Invalid Code</h1>
            <p className="auth-card__subtitle">
              This authorization code is invalid or has expired.
              <br />
              Run <code style={{ 
                background: "rgba(255,255,255,0.1)", 
                padding: "2px 6px", 
                borderRadius: "4px",
                fontFamily: "monospace"
              }}>isolated login</code> again to get a new code.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-page">
      <div className="auth-card">
        <a href="/" className="auth-back-link">
          ← BACK TO HOME
        </a>
        
        <div className="auth-card__header">
          <div className="auth-card__logo">
            ISOLATED<span className="dot">.</span>TECH
          </div>
          <h1 className="auth-card__title">Authorize CLI</h1>
          <p className="auth-card__subtitle">
            The <strong>isolated</strong> CLI is requesting access to your account.
          </p>
        </div>
        
        <div style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
          textAlign: "center",
        }}>
          <div style={{ 
            fontSize: "12px", 
            color: "rgba(255,255,255,0.5)",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}>
            Verification Code
          </div>
          <div style={{
            fontSize: "32px",
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: "4px",
            color: "#fff",
          }}>
            {code}
          </div>
        </div>
        
        <div style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.6)",
          marginBottom: "24px",
          lineHeight: "1.5",
        }}>
          Make sure this code matches what's shown in your terminal.
          <br />
          Signed in as <strong>{user.email}</strong>
        </div>
        
        <CLIAuthForm code={code} />
      </div>
    </div>
  );
}
