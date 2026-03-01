import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string; articleSlug: string }>;
}

// Redirect /apps/[slug]/blog/[articleSlug].html to /apps/[slug]/blog/[articleSlug]
// This handles legacy URLs from the old syncmd.isolated.tech site that have .html extensions
export default async function BlogRedirectPage({ params }: Props) {
  const { slug, articleSlug } = await params;
  
  // Remove .html extension if present and redirect to clean URL
  const cleanSlug = articleSlug.replace(/\.html$/, "");
  
  // Only redirect if there was an .html extension to strip
  if (cleanSlug !== articleSlug) {
    redirect(`/apps/${slug}/blog/${cleanSlug}`);
  }
  
  // If no .html extension, this is likely a 404 (static routes handle actual blog posts)
  redirect(`/apps/${slug}`);
}
