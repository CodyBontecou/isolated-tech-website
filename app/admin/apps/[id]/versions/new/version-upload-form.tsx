"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface VersionUploadFormProps {
  appId: string;
  appSlug: string;
  distributionType?: string;
}

export function VersionUploadForm({ appId, appSlug, distributionType = "binary" }: VersionUploadFormProps) {
  const isSourceCode = distributionType === "source_code";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [version, setVersion] = useState("");
  const [buildNumber, setBuildNumber] = useState("");
  const [minOsVersion, setMinOsVersion] = useState("14.0");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [signature, setSignature] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "application/zip",
        "application/x-apple-diskimage",
        "application/gzip",
        "application/x-gzip",
        "application/octet-stream",
      ];
      const validExtensions = [".zip", ".dmg", ".tar.gz"];
      const hasValidExtension = validExtensions.some((ext) =>
        selectedFile.name.toLowerCase().endsWith(ext)
      );

      if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
        setError("Please select a .zip, .dmg, or .tar.gz file");
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!version.trim()) {
      setError("Version is required");
      return;
    }

    if (!buildNumber || parseInt(buildNumber) < 1) {
      setError("Build number must be at least 1");
      return;
    }

    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned upload URL
      setUploadProgress(10);
      const presignRes = await fetch("/api/admin/versions/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          appSlug,
          version: version.trim(),
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error || "Failed to get upload URL");
      }

      const { r2Key } = await presignRes.json();
      setUploadProgress(20);

      // Step 2: Upload file directly to R2 via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("r2Key", r2Key);

      const uploadRes = await fetch("/api/admin/versions/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        throw new Error(data.error || "Failed to upload file");
      }

      setUploadProgress(70);

      // Step 3: Create version record
      const createRes = await fetch("/api/admin/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId,
          version: version.trim(),
          buildNumber: parseInt(buildNumber),
          minOsVersion: minOsVersion.trim(),
          releaseNotes: releaseNotes.trim() || null,
          r2Key,
          fileSize: file.size,
          signature: signature.trim() || null,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Failed to create version");
      }

      setUploadProgress(100);

      // Success - redirect back to app page
      router.push(`/admin/apps/${appId}?success=version`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          className="auth-message auth-message--error"
          style={{ marginBottom: "1.5rem" }}
        >
          {error}
        </div>
      )}

      {/* Version */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1 }}>
          <label className="settings-label">VERSION *</label>
          <input
            type="text"
            className="settings-input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.2.0"
            pattern="^\d+\.\d+\.\d+$"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--gray)",
              marginTop: "0.25rem",
            }}
          >
            Semantic version (e.g., 1.2.0)
          </p>
        </div>
        <div style={{ flex: 1 }}>
          <label className="settings-label">BUILD NUMBER *</label>
          <input
            type="number"
            className="settings-input"
            value={buildNumber}
            onChange={(e) => setBuildNumber(e.target.value)}
            placeholder="42"
            min="1"
            style={{ fontFamily: "var(--font-mono)" }}
          />
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--gray)",
              marginTop: "0.25rem",
            }}
          >
            Integer, must increase
          </p>
        </div>
      </div>

      {/* Min OS Version */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">MINIMUM OS VERSION</label>
        <select
          className="settings-input"
          value={minOsVersion}
          onChange={(e) => setMinOsVersion(e.target.value)}
        >
          {isSourceCode ? (
            <>
              <option value="15.0">iOS 15.0</option>
              <option value="16.0">iOS 16.0</option>
              <option value="17.0">iOS 17.0</option>
              <option value="18.0">iOS 18.0</option>
              <option value="19.0">iOS 19.0</option>
            </>
          ) : (
            <>
              <option value="12.0">macOS 12.0 (Monterey)</option>
              <option value="13.0">macOS 13.0 (Ventura)</option>
              <option value="14.0">macOS 14.0 (Sonoma)</option>
              <option value="15.0">macOS 15.0 (Sequoia)</option>
            </>
          )}
        </select>
      </div>

      {/* Release Notes */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">RELEASE NOTES (MARKDOWN)</label>
        <textarea
          className="settings-input"
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          placeholder="### New Features&#10;- Feature 1&#10;- Feature 2&#10;&#10;### Bug Fixes&#10;- Fix 1"
          rows={8}
          style={{ resize: "vertical", minHeight: "150px" }}
        />
      </div>

      {/* File Upload */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label className="settings-label">
          {isSourceCode ? "FILE (.zip or .tar.gz) *" : "FILE (.zip or .dmg) *"}
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: "2rem",
            border: "2px dashed #333",
            textAlign: "center",
            cursor: "crosshair",
            background: file ? "rgba(74, 222, 128, 0.1)" : "transparent",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={isSourceCode ? ".zip,.tar.gz" : ".zip,.dmg"}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          {file ? (
            <div>
              <p style={{ fontWeight: 700 }}>{file.name}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--gray)" }}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: "0.5rem" }}>
                Click to select or drag and drop
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--gray)" }}>
                {isSourceCode ? ".zip or .tar.gz files — Xcode project source" : ".zip or .dmg files only"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sparkle Signature (hidden for source code) */}
      {!isSourceCode && (
        <div style={{ marginBottom: "2rem" }}>
          <label className="settings-label">SPARKLE SIGNATURE (OPTIONAL)</label>
          <input
            type="text"
            className="settings-input"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="EdDSA signature from sign_update tool"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
          />
          <p
            style={{
              fontSize: "0.7rem",
              color: "var(--gray)",
              marginTop: "0.25rem",
            }}
          >
            Generate with: ./bin/sign_update YourApp.zip
          </p>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              height: "4px",
              background: "#333",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${uploadProgress}%`,
                background: "#4ade80",
                transition: "width 0.3s",
              }}
            />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--gray)" }}>
            {uploadProgress < 20
              ? "Preparing upload..."
              : uploadProgress < 70
                ? "Uploading file..."
                : uploadProgress < 100
                  ? "Creating version..."
                  : "Complete!"}
          </p>
        </div>
      )}

      {/* Submit */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          className="auth-btn"
          disabled={isUploading}
          style={{ width: "auto" }}
        >
          {isUploading ? "UPLOADING..." : "UPLOAD VERSION"}
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--outline"
          onClick={() => router.back()}
          disabled={isUploading}
          style={{ width: "auto" }}
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}
