"use client";

import { useState } from "react";
import {
  generateOGPngClient,
  uploadOGImage,
} from "@/lib/og/client-generate";

interface OGGeneratorProps {
  appSlug: string;
  appName: string;
  appTagline: string | null;
  iconUrl: string | null;
}

/**
 * Admin component for generating and uploading OG images
 * Uses browser Canvas to render the image (supports icons properly)
 */
export function OGGenerator({
  appSlug,
  appName,
  appTagline,
  iconUrl,
}: OGGeneratorProps) {
  const [status, setStatus] = useState<
    "idle" | "generating" | "uploading" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatus("generating");
    setError(null);
    setPreviewUrl(null);

    try {
      // Generate PNG in browser
      const pngBlob = await generateOGPngClient({
        name: appName,
        tagline: appTagline,
        iconUrl: iconUrl,
      });

      // Create preview URL
      const blobUrl = URL.createObjectURL(pngBlob);
      setPreviewUrl(blobUrl);

      // Upload to server
      setStatus("uploading");
      const result = await uploadOGImage(appSlug, pngBlob);

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStatus("error");
    }
  };

  return (
    <div className="og-generator">
      <div className="og-generator__header">
        <h4>OG Image</h4>
        <p className="text-muted">
          Generate a social sharing preview image for this app.
        </p>
      </div>

      {previewUrl && (
        <div className="og-generator__preview">
          <img
            src={previewUrl}
            alt="OG Preview"
            style={{
              width: "100%",
              maxWidth: 600,
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          />
        </div>
      )}

      <div className="og-generator__actions">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={status === "generating" || status === "uploading"}
          className="btn btn--outline"
          style={{ marginTop: "1rem" }}
        >
          {status === "generating" && "Generating..."}
          {status === "uploading" && "Uploading..."}
          {status === "success" && "✓ Regenerate OG Image"}
          {status === "error" && "Retry Generation"}
          {status === "idle" && "Generate OG Image"}
        </button>

        {status === "success" && (
          <span className="text-success" style={{ marginLeft: "1rem" }}>
            OG image uploaded successfully!
          </span>
        )}

        {error && (
          <span className="text-error" style={{ marginLeft: "1rem" }}>
            {error}
          </span>
        )}
      </div>

      <div className="og-generator__info" style={{ marginTop: "1rem" }}>
        <small className="text-muted">
          Preview: <a href={`/api/og/${appSlug}`} target="_blank" rel="noopener">
            /api/og/{appSlug}
          </a>
        </small>
      </div>
    </div>
  );
}
