-- ============================================================
-- ADD SYNC.MD OBSIDIAN GIT iOS SETUP GUIDE
-- ============================================================

-- Insert the guide article for Sync.md (obsidian-git-ios-setup)
-- The app_id is resolved at runtime via a subquery
INSERT INTO help_articles (
  id,
  app_id,
  slug,
  title,
  body,
  category,
  sort_order,
  is_published,
  article_type,
  created_at,
  updated_at
)
SELECT
  'guide_syncmd_obsidian_git_ios',
  id,
  'obsidian-git-ios-setup',
  'Using Sync.md with Obsidian Git on iOS',
  '## TL;DR

1. In **Sync.md**, set the default save location to Obsidian''s iOS file system
2. Clone your vault''s Git repo into that directory
3. Install the **Obsidian Git** community plugin
4. Set your **GitHub username**, **author name**, and **author email**
5. Done — pull, commit, and push from Obsidian

## The problem

If you use Obsidian on your desktop with the [Obsidian Git](https://github.com/Vinzent03/obsidian-git) plugin, you already have a great workflow: your vault is a Git repo, every edit is version-controlled, and your notes push to GitHub automatically.

Then you open Obsidian on your iPhone and realize — **there''s no Git on iOS**. The mobile app doesn''t ship with git, and the Obsidian Git plugin can''t clone or push on its own without a real `.git` directory already in place.

That''s what Sync.md solves. It uses **libgit2** to perform real Git operations natively on iOS — clone, pull, commit, push — and writes an actual `.git` directory to the filesystem. Once that directory exists inside Obsidian''s file system, the Obsidian Git plugin picks it up and everything just works.

## What you''ll need

- **Sync.md** installed on your iPhone ([App Store](https://apps.apple.com/us/app/sync-md/id6758960270))
- **Obsidian** installed on your iPhone ([App Store](https://apps.apple.com/app/obsidian-connected-notes/id1557175442))
- A **GitHub account** with a repository containing your Obsidian vault

If you haven''t pushed your vault to GitHub yet, you can do that from your desktop first — just `git init` inside your vault folder, commit everything, and push to a new repo.

## Step 1: Sign in to Sync.md

Open Sync.md and sign in with your **GitHub account**. You can use OAuth (tap "Sign in with GitHub") or paste a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo&description=Sync.md) — either works.

## Step 2: Set the save location to Obsidian''s filesystem

This is the key step. During onboarding (or later in **App Settings**), Sync.md asks you where to save cloned repos. Tap **"Choose Location"** and navigate to:

```
On My iPhone → Obsidian
```

This is the root of Obsidian''s iOS file system. By cloning directly into this directory, your repo will appear as an Obsidian vault automatically.

> **Why this works:** On iOS, each app has its own sandboxed directory in the Files app. When Sync.md clones a repo into Obsidian''s directory, it creates a real folder with a real `.git` directory inside it — exactly what Obsidian Git needs to function. Obsidian sees the folder as a vault, and the plugin sees the `.git` directory and treats it as a working repository.

## Step 3: Clone your vault repo

Back in Sync.md, tap **"Add Repository"** and browse your GitHub repos. Find your Obsidian vault repo and tap to add it, then hit **"Clone Repository"**.

Sync.md will clone the full repo — including the `.git` directory with your complete commit history — straight into Obsidian''s file system.

## Step 4: Open the vault in Obsidian

Open Obsidian on your iPhone. If this is your first time, you''ll see the vault picker. Your cloned repo should appear as an available vault — tap it to open.

If you already have other vaults, tap **"Open folder as vault"** and select the cloned repo from Obsidian''s file system.

You should see all your notes, just like on your desktop.

## Step 5: Install the Obsidian Git plugin

Inside Obsidian, go to **Settings → Community Plugins → Browse** and search for **"Obsidian Git"**. Install it and enable it.

> **Tip:** If you already have the Obsidian Git plugin configured in your vault on your desktop, its settings file (`.obsidian/plugins/obsidian-git/data.json`) may already be in the repo. In that case, the plugin will be installed automatically when Obsidian opens the vault — you just need to enable it.

## Step 6: Configure Obsidian Git

Open the Obsidian Git plugin settings (**Settings → Obsidian Git**) and fill in three fields:

- **Username on your git server:** Your GitHub username (e.g. `CodyBontecou`)
- **Author name for commit:** Your name (e.g. `Cody Bontecou`)
- **Author email for commit:** Your email (e.g. `cody@example.com`)

That''s it. No tokens to paste, no SSH keys to generate, no authentication configuration. The plugin uses the existing `.git` directory and remote configuration that Sync.md already set up when it cloned the repo.

## That''s it — it just works

Once those three fields are set, Obsidian Git can pull, commit, and push your vault. You can use the command palette (swipe down) and run commands like:

- **Obsidian Git: Pull** — fetch the latest changes from GitHub
- **Obsidian Git: Commit all changes** — stage and commit your edits
- **Obsidian Git: Push** — push commits to GitHub

Or, if you''ve enabled auto-sync in the plugin settings, it will pull and push on a timer automatically. Edit a note on your phone, and it shows up on your desktop. Edit on your desktop, pull on your phone. **Real Git, real version history, no sync conflicts.**

> **Tip:** You can also use Sync.md itself to pull and push at any time — tap the repo in Sync.md and use the Pull or Commit & Push buttons. Both apps work with the same `.git` directory, so they stay in sync with each other.

## Why this works so well

Most iOS Git solutions use REST APIs or custom sync layers that don''t leave a `.git` directory on disk. Sync.md is different — it''s built on **libgit2**, the same C library that powers GitHub Desktop, and it creates real Git repositories on the iOS filesystem. That means:

- **Full compatibility** — any tool that reads `.git` directories works out of the box
- **Complete history** — your entire commit log is on your device
- **No middleman** — your iPhone talks directly to GitHub, no third-party cloud in between
- **No subscription** — unlike Obsidian Sync ($8/mo), this is a one-time purchase + your existing GitHub account

## Troubleshooting

### Obsidian doesn''t see the vault

Make sure you set Sync.md''s save location to `On My iPhone → Obsidian` *before* cloning. If you cloned to the wrong location, you can remove the repo in Sync.md, update the save location in App Settings, and clone again.

### Obsidian Git says "no git repository found"

This usually means the `.git` directory wasn''t cloned properly. Open Sync.md, check that the repo shows as "Cloned" with a branch and commit SHA visible. If it looks right, try closing and reopening Obsidian.

### Push fails from Obsidian Git

Obsidian Git on iOS relies on the credentials already configured in the `.git/config` remote URL. If the remote was set up via Sync.md with OAuth or a PAT, the credentials are embedded. Make sure your GitHub username in the plugin settings matches the one you signed in with in Sync.md.

### Changes made in Obsidian don''t appear in Sync.md

That''s normal — both apps share the same filesystem. When you edit a file in Obsidian and then open Sync.md, it will detect the changes automatically. They''re reading and writing the same files.

## Recap

The whole setup takes about two minutes:

1. Point Sync.md''s save directory at Obsidian''s iOS file system
2. Clone your vault repo
3. Set up Obsidian Git with your username, name, and email

No complex configuration, no SSH keys, no cloud middleman. Just real Git on your iPhone, working seamlessly with the app you already use for your notes.

---

**Sync.md** is available on the [App Store](https://apps.apple.com/us/app/sync-md/id6758960270) and is [open source on GitHub](https://github.com/CodyBontecou/Sync.md).',
  'getting-started',
  10,
  1,
  'guide',
  '2026-02-15T00:00:00Z',
  '2026-02-15T00:00:00Z'
FROM apps
WHERE slug = 'syncmd';
