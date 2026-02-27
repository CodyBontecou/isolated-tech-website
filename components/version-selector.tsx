"use client";

import { useState, useEffect, useRef } from "react";

interface Version {
  id: string;
  version: string;
  build_number: number;
  release_notes: string | null;
  released_at: string;
  is_latest: number;
  file_size_bytes: number | null;
}

interface VersionSelectorProps {
  appId: string;
  currentVersionId: string | null;
  currentVersion: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function VersionSelector({
  appId,
  currentVersionId,
  currentVersion,
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch versions when dropdown opens
  useEffect(() => {
    if (isOpen && versions === null && !loading) {
      setLoading(true);
      setError(null);

      fetch(`/api/apps/${appId}/versions`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load versions");
          return res.json() as Promise<{ versions: Version[] }>;
        })
        .then((data) => {
          setVersions(data.versions);
          // Find the current version
          const current = data.versions.find(
            (v) => v.id === currentVersionId
          );
          if (current) setSelectedVersion(current);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, versions, loading, appId, currentVersionId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleVersionSelect = (version: Version) => {
    setSelectedVersion(version);
    setIsOpen(false);
  };

  const downloadVersion = selectedVersion || {
    id: currentVersionId,
    version: currentVersion,
  };

  if (!currentVersionId) {
    return (
      <span className="purchased-card__btn purchased-card__btn--disabled">
        Download unavailable
      </span>
    );
  }

  return (
    <div className="version-selector" ref={dropdownRef}>
      <div className="version-selector__row">
        <a
          href={`/api/download/${appId}/${downloadVersion.id}`}
          className="purchased-card__btn version-selector__download"
        >
          ↓ DOWNLOAD v{downloadVersion.version}
        </a>
        <button
          type="button"
          className="version-selector__toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Select version"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="version-selector__dropdown">
          {loading && (
            <div className="version-selector__loading">Loading versions...</div>
          )}

          {error && <div className="version-selector__error">{error}</div>}

          {versions && versions.length > 0 && (
            <div className="version-selector__list">
              {versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`version-selector__item ${
                    selectedVersion?.id === v.id
                      ? "version-selector__item--selected"
                      : ""
                  }`}
                  onClick={() => handleVersionSelect(v)}
                >
                  <div className="version-selector__item-header">
                    <span className="version-selector__item-version">
                      v{v.version}
                      {v.is_latest === 1 && (
                        <span className="version-selector__latest">LATEST</span>
                      )}
                    </span>
                    {v.file_size_bytes && (
                      <span className="version-selector__item-size">
                        {formatFileSize(v.file_size_bytes)}
                      </span>
                    )}
                  </div>
                  <span className="version-selector__item-date">
                    {formatDate(v.released_at)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {versions && versions.length === 0 && (
            <div className="version-selector__empty">No versions available</div>
          )}
        </div>
      )}
    </div>
  );
}
