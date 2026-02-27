"use client";

import Link from "next/link";

interface Download {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  app_id: string;
  app_name: string;
  app_slug: string;
  version_id: string;
  version_string: string;
  download_type: string;
  country: string | null;
  downloaded_at: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DownloadTypeBadge({ type }: { type: string }) {
  if (type === "token") {
    return (
      <span
        style={{
          color: "#fbbf24",
          fontSize: "0.7rem",
          fontWeight: 700,
        }}
      >
        TOKEN
      </span>
    );
  }
  return (
    <span
      style={{
        color: "#4ade80",
        fontSize: "0.7rem",
        fontWeight: 700,
      }}
    >
      AUTH
    </span>
  );
}

// Country code to flag emoji
function getCountryFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function DownloadsTable({ downloads }: { downloads: Download[] }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>USER</th>
            <th>APP</th>
            <th>VERSION</th>
            <th>TYPE</th>
            <th>COUNTRY</th>
            <th>DATE</th>
          </tr>
        </thead>
        <tbody>
          {downloads.map((download) => (
            <tr key={download.id}>
              <td>
                <div className="admin-table__user">
                  <span className="admin-table__user-name">
                    {download.user_name || "Anonymous"}
                  </span>
                  <span className="admin-table__user-email">
                    {download.user_email}
                  </span>
                </div>
              </td>
              <td>
                <Link
                  href={`/admin/apps/${download.app_id}`}
                  style={{ color: "var(--white)" }}
                >
                  {download.app_name}
                </Link>
              </td>
              <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                v{download.version_string}
              </td>
              <td>
                <DownloadTypeBadge type={download.download_type} />
              </td>
              <td style={{ fontSize: "1.1rem" }}>
                {getCountryFlag(download.country)}
              </td>
              <td className="admin-table__date">
                {formatDate(download.downloaded_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
