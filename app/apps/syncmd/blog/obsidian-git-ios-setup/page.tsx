import { Metadata } from "next";
import Link from "next/link";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { AppNav, AppFooter } from "@/components/app-page";

export const metadata: Metadata = {
  title: "How to Set Up Sync.md with Obsidian Git on iOS — Sync.md — ISOLATED.TECH",
  description:
    "A step-by-step guide to syncing your Obsidian vault with Git on iOS using Sync.md and the Obsidian Git plugin. Real version control on your iPhone.",
};

export default async function ObsidianGitGuide() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <AppNav user={user} redirectPath="/apps/syncmd/blog/obsidian-git-ios-setup" />

      <article className="obs-article">
        <header className="obs-meta">
          <div className="obs-date">February 15, 2026 — Guide</div>
          <h1 className="obs-title">
            Using Sync<span className="obs-accent">.md</span> with Obsidian Git on iOS
          </h1>
          <p className="obs-subtitle">
            How to set up real Git-backed vault syncing on your iPhone using Sync.md and the
            Obsidian Git community plugin — no Obsidian Sync subscription, no iCloud conflicts, no
            compromises.
          </p>
        </header>

        <div className="obs-body">
          {/* TLDR */}
          <div className="obs-tldr">
            <div className="obs-tldr-title">TL;DR</div>
            <ol>
              <li>
                In <strong>Sync.md</strong>, set the default save location to Obsidian's iOS file
                system
              </li>
              <li>Clone your vault's Git repo into that directory</li>
              <li>
                Install the <strong>Obsidian Git</strong> community plugin
              </li>
              <li>
                Set your <strong>GitHub username</strong>, <strong>author name</strong>, and{" "}
                <strong>author email</strong>
              </li>
              <li>Done — pull, commit, and push from Obsidian</li>
            </ol>
          </div>

          <h2>The problem</h2>

          <p>
            If you use Obsidian on your desktop with the{" "}
            <a href="https://github.com/Vinzent03/obsidian-git" target="_blank" rel="noreferrer">
              Obsidian Git
            </a>{" "}
            plugin, you already have a great workflow: your vault is a Git repo, every edit is
            version-controlled, and your notes push to GitHub automatically.
          </p>

          <p>
            Then you open Obsidian on your iPhone and realize — <strong>there's no Git on iOS</strong>.
            The mobile app doesn't ship with git, and the Obsidian Git plugin can't clone or push
            on its own without a real <code>.git</code> directory already in place.
          </p>

          <p>
            That's what Sync.md solves. It uses <strong>libgit2</strong> to perform real Git
            operations natively on iOS — clone, pull, commit, push — and writes an actual{" "}
            <code>.git</code> directory to the filesystem. Once that directory exists inside
            Obsidian's file system, the Obsidian Git plugin picks it up and everything just works.
          </p>

          {/* Architecture diagram */}
          <div className="obs-flow">
            <div className="obs-flow-node">GitHub</div>
            <div className="obs-flow-arrow">←→</div>
            <div className="obs-flow-node obs-flow-highlight">Sync.md</div>
            <div className="obs-flow-arrow">→</div>
            <div className="obs-flow-node">Obsidian filesystem</div>
            <div className="obs-flow-arrow">←→</div>
            <div className="obs-flow-node">Obsidian Git plugin</div>
          </div>

          <h2>What you'll need</h2>

          <ul>
            <li>
              <strong>Sync.md</strong> installed on your iPhone (
              <a href="https://apps.apple.com/us/app/sync-md/id6758960270" target="_blank" rel="noreferrer">
                App Store
              </a>
              )
            </li>
            <li>
              <strong>Obsidian</strong> installed on your iPhone (
              <a
                href="https://apps.apple.com/app/obsidian-connected-notes/id1557175442"
                target="_blank"
                rel="noreferrer"
              >
                App Store
              </a>
              )
            </li>
            <li>
              A <strong>GitHub account</strong> with a repository containing your Obsidian vault
            </li>
          </ul>

          <p>
            If you haven't pushed your vault to GitHub yet, you can do that from your desktop first
            — just <code>git init</code> inside your vault folder, commit everything, and push to a
            new repo.
          </p>

          {/* STEPS */}
          <h2>Step-by-step setup</h2>

          <div className="obs-step" data-step="Step 1">
            <h3>Sign in to Sync.md</h3>
            <p>
              Open Sync.md and sign in with your <strong>GitHub account</strong>. You can use OAuth
              (tap "Sign in with GitHub") or paste a{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Sync.md"
                target="_blank"
                rel="noreferrer"
              >
                Personal Access Token
              </a>{" "}
              — either works.
            </p>
          </div>

          <div className="obs-step" data-step="Step 2">
            <h3>Set the save location to Obsidian's filesystem</h3>
            <p>
              This is the key step. During onboarding (or later in <strong>App Settings</strong>),
              Sync.md asks you where to save cloned repos. Tap <strong>"Choose Location"</strong>{" "}
              and navigate to:
            </p>
            <pre>
              <code>On My iPhone → Obsidian</code>
            </pre>
            <p>
              This is the root of Obsidian's iOS file system. By cloning directly into this
              directory, your repo will appear as an Obsidian vault automatically.
            </p>
          </div>

          <div className="obs-callout">
            <span className="obs-callout-label">Why this works</span>
            <p>
              On iOS, each app has its own sandboxed directory in the Files app. When Sync.md
              clones a repo into Obsidian's directory, it creates a real folder with a real{" "}
              <code>.git</code> directory inside it — exactly what Obsidian Git needs to function.
              Obsidian sees the folder as a vault, and the plugin sees the <code>.git</code>{" "}
              directory and treats it as a working repository.
            </p>
          </div>

          <div className="obs-step" data-step="Step 3">
            <h3>Clone your vault repo</h3>
            <p>
              Back in Sync.md, tap <strong>"Add Repository"</strong> and browse your GitHub repos.
              Find your Obsidian vault repo and tap to add it, then hit{" "}
              <strong>"Clone Repository"</strong>.
            </p>
            <p>
              Sync.md will clone the full repo — including the <code>.git</code> directory with
              your complete commit history — straight into Obsidian's file system.
            </p>
          </div>

          <div className="obs-step" data-step="Step 4">
            <h3>Open the vault in Obsidian</h3>
            <p>
              Open Obsidian on your iPhone. If this is your first time, you'll see the vault
              picker. Your cloned repo should appear as an available vault — tap it to open.
            </p>
            <p>
              If you already have other vaults, tap <strong>"Open folder as vault"</strong> and
              select the cloned repo from Obsidian's file system.
            </p>
            <p>You should see all your notes, just like on your desktop.</p>
          </div>

          <div className="obs-step" data-step="Step 5">
            <h3>Install the Obsidian Git plugin</h3>
            <p>
              Inside Obsidian, go to <strong>Settings → Community Plugins → Browse</strong> and
              search for <strong>"Obsidian Git"</strong>. Install it and enable it.
            </p>

            <div className="obs-callout obs-callout-tip">
              <span className="obs-callout-label">Tip</span>
              <p>
                If you already have the Obsidian Git plugin configured in your vault on your
                desktop, its settings file (<code>.obsidian/plugins/obsidian-git/data.json</code>)
                may already be in the repo. In that case, the plugin will be installed
                automatically when Obsidian opens the vault — you just need to enable it.
              </p>
            </div>
          </div>

          <div className="obs-step" data-step="Step 6">
            <h3>Configure Obsidian Git</h3>
            <p>
              Open the Obsidian Git plugin settings (<strong>Settings → Obsidian Git</strong>) and
              fill in three fields:
            </p>

            <div className="obs-settings">
              <div className="obs-settings-row">
                <div className="obs-settings-key">Username on your git server</div>
                <div className="obs-settings-val">
                  Your GitHub username (e.g. <code>CodyBontecou</code>)
                </div>
              </div>
              <div className="obs-settings-row">
                <div className="obs-settings-key">Author name for commit</div>
                <div className="obs-settings-val">
                  Your name (e.g. <code>Cody Bontecou</code>)
                </div>
              </div>
              <div className="obs-settings-row">
                <div className="obs-settings-key">Author email for commit</div>
                <div className="obs-settings-val">
                  Your email (e.g. <code>cody@example.com</code>)
                </div>
              </div>
            </div>

            <p>
              That's it. No tokens to paste, no SSH keys to generate, no authentication
              configuration. The plugin uses the existing <code>.git</code> directory and remote
              configuration that Sync.md already set up when it cloned the repo.
            </p>
          </div>

          <h2>That's it — it just works</h2>

          <p>
            Once those three fields are set, Obsidian Git can pull, commit, and push your vault.
            You can use the command palette (swipe down) and run commands like:
          </p>

          <ul>
            <li>
              <strong>Obsidian Git: Pull</strong> — fetch the latest changes from GitHub
            </li>
            <li>
              <strong>Obsidian Git: Commit all changes</strong> — stage and commit your edits
            </li>
            <li>
              <strong>Obsidian Git: Push</strong> — push commits to GitHub
            </li>
          </ul>

          <p>
            Or, if you've enabled auto-sync in the plugin settings, it will pull and push on a
            timer automatically. Edit a note on your phone, and it shows up on your desktop. Edit
            on your desktop, pull on your phone.{" "}
            <strong>Real Git, real version history, no sync conflicts.</strong>
          </p>

          <div className="obs-callout obs-callout-tip">
            <span className="obs-callout-label">Tip</span>
            <p>
              You can also use Sync.md itself to pull and push at any time — tap the repo in
              Sync.md and use the Pull or Commit & Push buttons. Both apps work with the same{" "}
              <code>.git</code> directory, so they stay in sync with each other.
            </p>
          </div>

          <h2>Why this works so well</h2>

          <p>
            Most iOS Git solutions use REST APIs or custom sync layers that don't leave a{" "}
            <code>.git</code> directory on disk. Sync.md is different — it's built on{" "}
            <strong>libgit2</strong>, the same C library that powers GitHub Desktop, and it creates
            real Git repositories on the iOS filesystem. That means:
          </p>

          <ul>
            <li>
              <strong>Full compatibility</strong> — any tool that reads <code>.git</code>{" "}
              directories works out of the box
            </li>
            <li>
              <strong>Complete history</strong> — your entire commit log is on your device
            </li>
            <li>
              <strong>No middleman</strong> — your iPhone talks directly to GitHub, no third-party
              cloud in between
            </li>
            <li>
              <strong>No subscription</strong> — unlike Obsidian Sync ($8/mo), this is a one-time
              purchase + your existing GitHub account
            </li>
          </ul>

          <h2>Troubleshooting</h2>

          <h3>Obsidian doesn't see the vault</h3>
          <p>
            Make sure you set Sync.md's save location to <code>On My iPhone → Obsidian</code>{" "}
            <em>before</em> cloning. If you cloned to the wrong location, you can remove the repo
            in Sync.md, update the save location in App Settings, and clone again.
          </p>

          <h3>Obsidian Git says "no git repository found"</h3>
          <p>
            This usually means the <code>.git</code> directory wasn't cloned properly. Open
            Sync.md, check that the repo shows as "Cloned" with a branch and commit SHA visible. If
            it looks right, try closing and reopening Obsidian.
          </p>

          <h3>Push fails from Obsidian Git</h3>
          <p>
            Obsidian Git on iOS relies on the credentials already configured in the{" "}
            <code>.git/config</code> remote URL. If the remote was set up via Sync.md with OAuth or
            a PAT, the credentials are embedded. Make sure your GitHub username in the plugin
            settings matches the one you signed in with in Sync.md.
          </p>

          <h3>Changes made in Obsidian don't appear in Sync.md</h3>
          <p>
            That's normal — both apps share the same filesystem. When you edit a file in Obsidian
            and then open Sync.md, it will detect the changes automatically. They're reading and
            writing the same files.
          </p>

          <h2>Recap</h2>

          <p>The whole setup takes about two minutes:</p>

          <ol>
            <li>Point Sync.md's save directory at Obsidian's iOS file system</li>
            <li>Clone your vault repo</li>
            <li>Set up Obsidian Git with your username, name, and email</li>
          </ol>

          <p>
            No complex configuration, no SSH keys, no cloud middleman. Just real Git on your
            iPhone, working seamlessly with the app you already use for your notes.
          </p>

          <p className="obs-footer-text">
            <strong>Sync.md</strong> is available on the{" "}
            <a href="https://apps.apple.com/us/app/sync-md/id6758960270">App Store</a> and is{" "}
            <a href="https://github.com/CodyBontecou/Sync.md" target="_blank" rel="noreferrer">
              open source on GitHub
            </a>
            .
          </p>
        </div>
      </article>

      <AppFooter />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

        .obs-article {
          max-width: 720px;
          margin: 0 auto;
          padding: 80px 24px 80px;
          font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
        }

        .obs-meta {
          margin-bottom: 48px;
        }

        .obs-date {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6a6a6a;
          margin-bottom: 16px;
        }

        .obs-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          color: #f5f5f7;
        }

        .obs-accent {
          color: #007AFF;
        }

        .obs-subtitle {
          font-size: 14px;
          font-weight: 300;
          color: #8a8a8a;
          line-height: 1.7;
        }

        .obs-body h2 {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin-top: 56px;
          margin-bottom: 20px;
          padding-top: 20px;
          border-top: 1px solid #2a2a2a;
          color: #f5f5f7;
        }

        .obs-body h3 {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin-top: 36px;
          margin-bottom: 12px;
          color: #b0b0b0;
        }

        .obs-body p {
          font-size: 14px;
          font-weight: 300;
          color: #8a8a8a;
          line-height: 1.85;
          margin-bottom: 20px;
        }

        .obs-body p strong {
          color: #f5f5f7;
          font-weight: 500;
        }

        .obs-body a {
          color: #007AFF;
          text-decoration: none;
          border-bottom: 1px solid rgba(0, 122, 255, 0.3);
          transition: border-color 0.2s ease;
        }

        .obs-body a:hover {
          border-color: #007AFF;
        }

        .obs-body ul,
        .obs-body ol {
          margin-bottom: 20px;
          padding-left: 20px;
        }

        .obs-body li {
          font-size: 14px;
          font-weight: 300;
          color: #8a8a8a;
          line-height: 1.85;
          margin-bottom: 8px;
        }

        .obs-body li strong {
          color: #f5f5f7;
          font-weight: 500;
        }

        .obs-body code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          padding: 2px 7px;
          border-radius: 4px;
          color: #007AFF;
        }

        .obs-body pre {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          padding: 20px 24px;
          margin-bottom: 24px;
          overflow-x: auto;
        }

        .obs-body pre code {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          line-height: 1.7;
          color: #b0b0b0;
        }

        /* TLDR box */
        .obs-tldr {
          border: 1px solid #2a2a2a;
          background: #1a1a1a;
          border-radius: 12px;
          padding: 24px 28px;
          margin-bottom: 32px;
        }

        .obs-tldr-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #007AFF;
          margin-bottom: 12px;
        }

        .obs-tldr ol {
          padding-left: 16px;
          margin-bottom: 0;
        }

        .obs-tldr li {
          font-size: 13px;
          margin-bottom: 4px;
        }

        /* Flow diagram */
        .obs-flow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 28px 20px;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          margin-bottom: 24px;
          background: #1a1a1a;
        }

        .obs-flow-node {
          background: #0a0a0a;
          border: 1px solid #3a3a3a;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          white-space: nowrap;
          color: #f5f5f7;
        }

        .obs-flow-highlight {
          border-color: #007AFF;
          color: #007AFF;
          background: rgba(0, 122, 255, 0.12);
        }

        .obs-flow-arrow {
          font-size: 14px;
          color: #6a6a6a;
        }

        /* Step cards */
        .obs-step {
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          padding: 28px;
          margin-bottom: 24px;
          position: relative;
          transition: border-color 0.3s ease;
        }

        .obs-step:hover {
          border-color: #3a3a3a;
        }

        .obs-step::before {
          content: attr(data-step);
          position: absolute;
          top: -12px;
          left: 20px;
          background: #0a0a0a;
          padding: 2px 12px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #007AFF;
          border: 1px solid #2a2a2a;
          border-radius: 20px;
        }

        .obs-step h3 {
          margin-top: 4px;
          margin-bottom: 12px;
          font-size: 17px;
          color: #f5f5f7;
        }

        .obs-step p {
          margin-bottom: 12px;
        }

        .obs-step p:last-child {
          margin-bottom: 0;
        }

        /* Callouts */
        .obs-callout {
          border-left: 3px solid #007AFF;
          background: rgba(0, 122, 255, 0.12);
          padding: 16px 20px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 24px;
        }

        .obs-callout p {
          color: #b0b0b0 !important;
          margin-bottom: 0 !important;
          font-size: 13px !important;
        }

        .obs-callout-tip {
          border-left-color: #30D158;
          background: rgba(48, 209, 88, 0.12);
        }

        .obs-callout-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #007AFF;
          margin-bottom: 6px;
          display: block;
        }

        .obs-callout-tip .obs-callout-label {
          color: #30D158;
        }

        /* Settings table */
        .obs-settings {
          width: 100%;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .obs-settings-row {
          display: flex;
          border-bottom: 1px solid #2a2a2a;
        }

        .obs-settings-row:last-child {
          border-bottom: none;
        }

        .obs-settings-key {
          font-size: 13px;
          font-weight: 500;
          color: #8a8a8a;
          padding: 12px 16px;
          width: 200px;
          flex-shrink: 0;
          background: #1a1a1a;
          border-right: 1px solid #2a2a2a;
        }

        .obs-settings-val {
          font-size: 13px;
          font-weight: 400;
          color: #f5f5f7;
          padding: 12px 16px;
          flex: 1;
        }

        .obs-footer-text {
          margin-top: 48px;
          padding-top: 20px;
          border-top: 1px solid #2a2a2a;
        }

        @media (max-width: 600px) {
          .obs-article {
            padding: 60px 16px 60px;
          }
          .obs-title {
            font-size: 26px;
          }
          .obs-step {
            padding: 20px;
          }
          .obs-flow {
            flex-direction: column;
          }
          .obs-flow-arrow {
            transform: rotate(90deg);
          }
          .obs-settings-row {
            flex-direction: column;
          }
          .obs-settings-key {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #2a2a2a;
          }
        }
      `}</style>
    </>
  );
}
