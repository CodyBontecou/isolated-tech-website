/**
 * Subdomain Redirect Worker
 * 
 * Redirects <app>.isolated.tech/* to https://isolated.tech/apps/<app>/*
 * 
 * Examples:
 *   healthmd.isolated.tech → https://isolated.tech/apps/healthmd
 *   healthmd.isolated.tech/privacy → https://isolated.tech/apps/healthmd/privacy
 */

interface Env {}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Extract subdomain from hostname (e.g., "healthmd" from "healthmd.isolated.tech")
    const parts = hostname.split('.');
    
    // Handle *.isolated.tech pattern
    if (parts.length >= 3 && parts.slice(-2).join('.') === 'isolated.tech') {
      const subdomain = parts.slice(0, -2).join('.');
      
      // Skip www subdomain (handled by main worker)
      if (subdomain === 'www') {
        return fetch(request);
      }
      
      // Proxy consulting subdomain to Cloudflare Pages
      if (subdomain === 'consulting') {
        const pagesUrl = new URL(request.url);
        pagesUrl.hostname = 'ai-consulting-1qe.pages.dev';
        return fetch(pagesUrl.toString(), request);
      }
      
      // Build the redirect URL
      const path = url.pathname === '/' ? '' : url.pathname;
      const search = url.search || '';
      const redirectUrl = `https://isolated.tech/apps/${subdomain}${path}${search}`;
      
      // Return 301 permanent redirect
      return Response.redirect(redirectUrl, 301);
    }
    
    // Fallback: pass through (shouldn't happen with proper routing)
    return fetch(request);
  },
};
