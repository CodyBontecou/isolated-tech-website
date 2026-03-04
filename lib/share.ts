/**
 * Pi Session Share Handler
 *
 * Handles uploading and serving pi coding agent session HTML exports.
 *
 * POST /share/upload - Upload a session HTML with optional git context
 * GET /share/:id - Serve a shared session HTML with git context header
 */

import type { Env } from "./env";

/** Git context captured at share time */
interface GitContext {
  repo?: string; // Remote URL (e.g., github.com/user/repo)
  branch?: string;
  commit?: string; // HEAD commit SHA
  commitMessage?: string;
  commitUrl?: string; // Full URL to commit
  dirty?: boolean; // Had uncommitted changes
}

/** Share metadata stored alongside HTML */
interface ShareMetadata {
  uploadedAt: string;
  git?: GitContext;
}

function generateId(): string {
  // Generate a short, URL-safe ID (8 chars = ~48 bits of entropy)
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/** Generate git context header HTML to inject into shared sessions */
function generateGitHeader(meta: ShareMetadata): string {
  if (!meta.git?.repo && !meta.git?.commit) {
    return "";
  }

  const git = meta.git;
  const uploadDate = new Date(meta.uploadedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Build repo link
  let repoHtml = "";
  if (git.repo) {
    const repoUrl = git.repo.startsWith("http")
      ? git.repo
      : `https://${git.repo}`;
    const repoName = git.repo
      .replace(/^https?:\/\//, "")
      .replace(/\.git$/, "");
    repoHtml = `<a href="${repoUrl}" target="_blank" rel="noopener" class="pi-share-link">${repoName}</a>`;
  }

  // Build commit link
  let commitHtml = "";
  if (git.commit) {
    const shortSha = git.commit.slice(0, 7);
    if (git.commitUrl) {
      commitHtml = `<a href="${git.commitUrl}" target="_blank" rel="noopener" class="pi-share-link">${shortSha}</a>`;
    } else {
      commitHtml = `<code>${shortSha}</code>`;
    }
    if (git.dirty) {
      commitHtml += ` <span class="pi-share-dirty">+uncommitted</span>`;
    }
  }

  // Build branch info
  let branchHtml = "";
  if (git.branch) {
    branchHtml = `<span class="pi-share-branch">${git.branch}</span>`;
  }

  return `
<style>
  .pi-share-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.9) 100%);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding: 10px 16px;
    font-family: ui-monospace, 'SF Mono', 'Monaco', monospace;
    font-size: 12px;
    color: #888;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .pi-share-header a.pi-share-link {
    color: #fff;
    text-decoration: none;
  }
  .pi-share-header a.pi-share-link:hover {
    text-decoration: underline;
  }
  .pi-share-header code {
    background: rgba(255,255,255,0.1);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: inherit;
  }
  .pi-share-branch {
    color: #7fdbca;
  }
  .pi-share-dirty {
    color: #ffcb8b;
    font-size: 11px;
  }
  .pi-share-sep {
    color: #444;
  }
  .pi-share-logo {
    color: #666;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .pi-share-logo span { color: #444; }
  .pi-share-date {
    margin-left: auto;
    color: #555;
  }
  @media (max-width: 600px) {
    .pi-share-header {
      font-size: 11px;
      padding: 8px 12px;
      gap: 8px;
    }
    .pi-share-date { display: none; }
  }
</style>
<div class="pi-share-header">
  <span class="pi-share-logo">PI<span>.</span>SHARE</span>
  ${repoHtml ? `<span class="pi-share-sep">·</span> ${repoHtml}` : ""}
  ${branchHtml ? `<span class="pi-share-sep">·</span> ${branchHtml}` : ""}
  ${commitHtml ? `<span class="pi-share-sep">·</span> ${commitHtml}` : ""}
  <span class="pi-share-date">${uploadDate}</span>
</div>`;
}

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 — Pi Session Share</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Space Mono', 'SF Mono', 'Monaco', 'Menlo', monospace;
      background: #000;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    h1 { font-size: 4rem; margin-bottom: 1rem; }
    h1 span { color: #666; }
    p { color: #888; font-size: 0.9rem; }
    a { color: #fff; }
  </style>
</head>
<body>
  <h1>404<span>.</span></h1>
  <p>Session not found or expired.</p>
  <p style="margin-top: 1rem;"><a href="/">← Back to home</a></p>
</body>
</html>`;

export async function handleShareRequest(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only handle /share/* paths
  if (!path.startsWith("/share")) {
    return null;
  }

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // POST /share/upload - Upload a session
  if (request.method === "POST" && path === "/share/upload") {
    // Validate auth
    const auth = request.headers.get("Authorization");
    if (
      !env.PI_SHARE_SECRET ||
      !auth ||
      !auth.startsWith("Bearer ") ||
      auth.slice(7) !== env.PI_SHARE_SECRET
    ) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const contentType = request.headers.get("Content-Type") || "";

    let html: string;
    let gitContext: GitContext | undefined;

    // Support both JSON body (with metadata) and raw HTML
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json() as { html?: string; git?: GitContext };
        if (!body.html || typeof body.html !== "string") {
          return jsonResponse({ error: "Missing 'html' field in JSON body" }, 400);
        }
        html = body.html;
        gitContext = body.git;
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }
    } else if (
      contentType.includes("text/html") ||
      contentType.includes("application/octet-stream")
    ) {
      html = await request.text();
    } else {
      return jsonResponse(
        { error: "Content-Type must be application/json or text/html" },
        400
      );
    }

    if (!html || html.length < 100) {
      return jsonResponse({ error: "Invalid HTML content" }, 400);
    }

    // Build metadata
    const metadata: ShareMetadata = {
      uploadedAt: new Date().toISOString(),
      git: gitContext,
    };

    // Generate ID and store HTML
    const id = generateId();
    const htmlKey = `sessions/${id}.html`;
    const metaKey = `sessions/${id}.meta.json`;

    // Store HTML
    await env.PI_SHARES.put(htmlKey, html, {
      httpMetadata: {
        contentType: "text/html; charset=utf-8",
      },
    });

    // Store metadata separately
    await env.PI_SHARES.put(metaKey, JSON.stringify(metadata), {
      httpMetadata: {
        contentType: "application/json",
      },
    });

    const shareUrl = `https://isolated.tech/share/${id}`;

    return jsonResponse({
      ok: true,
      id,
      url: shareUrl,
    });
  }

  // GET /share/:id - Serve a session
  if (request.method === "GET" && path.startsWith("/share/")) {
    // Extract ID from path
    const id = path.slice("/share/".length);

    // Handle empty ID (landing page would be here, but we'll let vinext handle it)
    if (!id) {
      return null; // Let vinext handle /share landing
    }

    // Validate ID format (alphanumeric, dash, underscore, 6-12 chars)
    if (!/^[a-zA-Z0-9_-]{6,12}$/.test(id)) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const htmlKey = `sessions/${id}.html`;
    const metaKey = `sessions/${id}.meta.json`;

    // Fetch HTML and metadata in parallel
    const [htmlObject, metaObject] = await Promise.all([
      env.PI_SHARES.get(htmlKey),
      env.PI_SHARES.get(metaKey),
    ]);

    if (!htmlObject) {
      return new Response(NOT_FOUND_HTML, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    let html = await htmlObject.text();

    // If we have metadata with git context, inject the header
    if (metaObject) {
      try {
        const metadata: ShareMetadata = await metaObject.json();
        const headerHtml = generateGitHeader(metadata);

        if (headerHtml) {
          // Inject header after opening <body> tag
          html = html.replace(/<body([^>]*)>/i, `<body$1>${headerHtml}`);
        }
      } catch {
        // Ignore metadata parse errors, serve HTML as-is
      }
    }

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return null;
}
