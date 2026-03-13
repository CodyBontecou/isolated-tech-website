import { Command } from 'commander';
import ora from 'ora';
import { readFileSync, existsSync } from 'fs';
import { isAuthenticated } from '../lib/config.js';
import { api, BlogPost } from '../lib/api.js';
import { output, success, error, warn, info, banner, isJsonMode } from '../lib/output.js';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Not set';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length - 3) + '...';
}

// Main blog command with subcommands
export const blogCommand = new Command('blog')
  .description('Manage blog posts for your apps')
  .addCommand(listCommand())
  .addCommand(createCommand())
  .addCommand(updateCommand())
  .addCommand(deleteCommand())
  .addCommand(publishCommand())
  .addCommand(unpublishCommand())
  .addCommand(showCommand());

// List blog posts
function listCommand(): Command {
  return new Command('list')
    .alias('ls')
    .description('List blog posts')
    .option('-a, --app <slug>', 'Filter by app slug')
    .option('--drafts', 'Show only drafts')
    .option('--published', 'Show only published posts')
    .action(async (options) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        process.exit(1);
      }

      const spinner = isJsonMode() ? null : ora('Fetching blog posts...').start();

      const response = await api.listBlogPosts(options.app);

      if (!response.success || !response.data) {
        spinner?.fail('Failed to fetch blog posts');
        error('fetch_failed', response.message || 'Failed to fetch blog posts');
        process.exit(1);
      }

      let posts = response.data;

      // Filter by status
      if (options.drafts) {
        posts = posts.filter((p) => !p.is_published);
      } else if (options.published) {
        posts = posts.filter((p) => p.is_published);
      }

      spinner?.succeed(`Found ${posts.length} blog post${posts.length === 1 ? '' : 's'}`);

      if (isJsonMode()) {
        output({ success: true, posts });
      } else {
        if (posts.length === 0) {
          info('No blog posts found');
          info('Create one with: isolated blog create --app <slug> --title "My Post"');
        } else {
          console.log();
          posts.forEach((post) => {
            const status = post.is_published ? '✓' : '○';
            const statusColor = post.is_published ? '\x1b[32m' : '\x1b[33m';
            console.log(
              `  ${statusColor}${status}\x1b[0m  \x1b[1m${post.title}\x1b[0m`
            );
            console.log(`     \x1b[90m${post.app_name || post.app_slug} · ${post.slug}\x1b[0m`);
            console.log(`     \x1b[90mID: ${post.id} · ${formatDate(post.published_at || post.created_at)}\x1b[0m`);
            console.log();
          });
        }
      }
    });
}

// Show a single blog post
function showCommand(): Command {
  return new Command('show')
    .description('Show a blog post')
    .argument('<id>', 'Blog post ID')
    .action(async (id: string) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        process.exit(1);
      }

      const spinner = isJsonMode() ? null : ora('Fetching blog post...').start();

      const response = await api.getBlogPost(id);

      if (!response.success || !response.data) {
        spinner?.fail('Blog post not found');
        error('not_found', response.message || 'Blog post not found');
        process.exit(1);
      }

      spinner?.succeed('Blog post found');

      if (isJsonMode()) {
        output({ success: true, post: response.data });
      } else {
        const post = response.data;
        console.log();
        console.log(`  \x1b[1m${post.title}\x1b[0m`);
        console.log(`  \x1b[90m${post.app_name || post.app_slug} · /apps/${post.app_slug}/blog/${post.slug}\x1b[0m`);
        console.log();
        console.log(`  Status: ${post.is_published ? '\x1b[32mPublished\x1b[0m' : '\x1b[33mDraft\x1b[0m'}`);
        if (post.author_name) console.log(`  Author: ${post.author_name}`);
        if (post.published_at) console.log(`  Published: ${formatDate(post.published_at)}`);
        console.log(`  Created: ${formatDate(post.created_at)}`);
        console.log(`  Updated: ${formatDate(post.updated_at)}`);
        if (post.excerpt) {
          console.log();
          console.log(`  \x1b[90mExcerpt:\x1b[0m`);
          console.log(`  ${post.excerpt}`);
        }
        console.log();
        console.log(`  \x1b[90mBody (${post.body.length} chars):\x1b[0m`);
        console.log(`  ${truncate(post.body, 200)}`);
        console.log();
      }
    });
}

// Create a new blog post
function createCommand(): Command {
  return new Command('create')
    .description('Create a new blog post')
    .requiredOption('-a, --app <slug>', 'App slug')
    .requiredOption('-t, --title <title>', 'Post title')
    .option('-s, --slug <slug>', 'URL slug (auto-generated from title if not provided)')
    .option('-e, --excerpt <text>', 'Short excerpt/description')
    .option('-b, --body <text>', 'Post body (markdown)')
    .option('-f, --file <path>', 'Read body from markdown file')
    .option('--author <name>', 'Author name')
    .option('--cover <url>', 'Cover image URL')
    .option('-p, --publish', 'Publish immediately')
    .action(async (options) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        process.exit(1);
      }

      if (!isJsonMode()) {
        banner('isolated blog create');
      }

      // Get body content
      let body = options.body || '';
      if (options.file) {
        if (!existsSync(options.file)) {
          error('file_not_found', `File not found: ${options.file}`);
          process.exit(1);
        }
        body = readFileSync(options.file, 'utf-8');
      }

      if (!body.trim()) {
        error('missing_body', 'Post body is required', 'Use --body or --file to provide content');
        process.exit(1);
      }

      const slug = options.slug || generateSlug(options.title);

      const spinner = isJsonMode() ? null : ora('Creating blog post...').start();

      const response = await api.createBlogPost({
        appSlug: options.app,
        title: options.title,
        slug,
        excerpt: options.excerpt,
        body,
        authorName: options.author,
        coverImageUrl: options.cover,
        isPublished: options.publish || false,
      });

      if (!response.success || !response.data) {
        spinner?.fail('Failed to create blog post');
        error('create_failed', response.message || 'Failed to create blog post');
        process.exit(1);
      }

      spinner?.succeed('Blog post created');

      if (isJsonMode()) {
        output({ success: true, post: response.data });
      } else {
        const post = response.data;
        success('Blog post created!', {
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: post.is_published ? 'published' : 'draft',
          url: post.is_published ? `https://isolated.tech/apps/${post.app_slug}/blog/${post.slug}` : '(not published yet)',
        });
      }
    });
}

// Update a blog post
function updateCommand(): Command {
  return new Command('update')
    .description('Update a blog post')
    .argument('<id>', 'Blog post ID')
    .option('-t, --title <title>', 'New title')
    .option('-s, --slug <slug>', 'New slug')
    .option('-e, --excerpt <text>', 'New excerpt')
    .option('-b, --body <text>', 'New body (markdown)')
    .option('-f, --file <path>', 'Read body from markdown file')
    .option('--author <name>', 'Author name')
    .option('--cover <url>', 'Cover image URL')
    .action(async (id: string, options) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        process.exit(1);
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (options.title) updateData.title = options.title;
      if (options.slug) updateData.slug = options.slug;
      if (options.excerpt) updateData.excerpt = options.excerpt;
      if (options.author) updateData.authorName = options.author;
      if (options.cover) updateData.coverImageUrl = options.cover;

      if (options.file) {
        if (!existsSync(options.file)) {
          error('file_not_found', `File not found: ${options.file}`);
          process.exit(1);
        }
        updateData.body = readFileSync(options.file, 'utf-8');
      } else if (options.body) {
        updateData.body = options.body;
      }

      if (Object.keys(updateData).length === 0) {
        error('no_changes', 'No changes provided', 'Use --title, --body, --file, etc. to update fields');
        process.exit(1);
      }

      const spinner = isJsonMode() ? null : ora('Updating blog post...').start();

      const response = await api.updateBlogPost(id, updateData);

      if (!response.success || !response.data) {
        spinner?.fail('Failed to update blog post');
        error('update_failed', response.message || 'Failed to update blog post');
        process.exit(1);
      }

      spinner?.succeed('Blog post updated');

      if (isJsonMode()) {
        output({ success: true, post: response.data });
      } else {
        success('Blog post updated!', {
          id: response.data.id,
          title: response.data.title,
        });
      }
    });
}

// Delete a blog post
function deleteCommand(): Command {
  return new Command('delete')
    .alias('rm')
    .description('Delete a blog post')
    .argument('<id>', 'Blog post ID')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (id: string, options) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        process.exit(1);
      }

      // In non-JSON mode, require confirmation unless --yes
      if (!isJsonMode() && !options.yes) {
        // Get the post first to show what we're deleting
        const getResponse = await api.getBlogPost(id);
        if (getResponse.success && getResponse.data) {
          warn(`This will delete: "${getResponse.data.title}"`);
        }
        
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question('Are you sure? (y/N) ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          info('Cancelled');
          return;
        }
      }

      const spinner = isJsonMode() ? null : ora('Deleting blog post...').start();

      const response = await api.deleteBlogPost(id);

      if (!response.success) {
        spinner?.fail('Failed to delete blog post');
        error('delete_failed', response.message || 'Failed to delete blog post');
        process.exit(1);
      }

      spinner?.succeed('Blog post deleted');

      if (isJsonMode()) {
        output({ success: true, deleted: true, id });
      } else {
        success('Blog post deleted');
      }
    });
}

// Publish a blog post
function publishCommand(): Command {
  return new Command('publish')
    .description('Publish a draft blog post')
    .argument('<id>', 'Blog post ID')
    .action(async (id: string) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        process.exit(1);
      }

      const spinner = isJsonMode() ? null : ora('Publishing blog post...').start();

      const response = await api.publishBlogPost(id);

      if (!response.success || !response.data) {
        spinner?.fail('Failed to publish blog post');
        error('publish_failed', response.message || 'Failed to publish blog post');
        process.exit(1);
      }

      spinner?.succeed('Blog post published');

      if (isJsonMode()) {
        output({ success: true, post: response.data });
      } else {
        const post = response.data;
        success('Blog post published!', {
          title: post.title,
          url: `https://isolated.tech/apps/${post.app_slug}/blog/${post.slug}`,
        });
      }
    });
}

// Unpublish a blog post
function unpublishCommand(): Command {
  return new Command('unpublish')
    .description('Unpublish a blog post (make it a draft)')
    .argument('<id>', 'Blog post ID')
    .action(async (id: string) => {
      if (!isAuthenticated()) {
        error('not_authenticated', 'Not logged in', 'Run: isolated login');
        process.exit(1);
      }

      const spinner = isJsonMode() ? null : ora('Unpublishing blog post...').start();

      const response = await api.unpublishBlogPost(id);

      if (!response.success || !response.data) {
        spinner?.fail('Failed to unpublish blog post');
        error('unpublish_failed', response.message || 'Failed to unpublish blog post');
        process.exit(1);
      }

      spinner?.succeed('Blog post unpublished');

      if (isJsonMode()) {
        output({ success: true, post: response.data });
      } else {
        success('Blog post is now a draft', {
          title: response.data.title,
        });
      }
    });
}
