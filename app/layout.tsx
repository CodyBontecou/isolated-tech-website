import type { Metadata } from "next";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages.css";
import { ThemeProvider } from "@/components/theme-provider";

const siteUrl = "https://isolated.tech";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ISOLATED.TECH — We build software.",
    template: "%s — ISOLATED.TECH",
  },
  description:
    "Isolated Tech is a product studio and client web partner building polished apps and high-converting websites.",
  keywords: [
    "macOS apps",
    "iOS apps",
    "indie software",
    "developer tools",
    "pay what you want",
  ],
  authors: [{ name: "Cody Bontecou", url: siteUrl }],
  creator: "Isolated Tech",
  publisher: "Isolated Tech",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "ISOLATED.TECH",
    title: "ISOLATED.TECH — We build software.",
    description:
      "Product studio and client web partner. iOS/macOS apps plus conversion-focused websites.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ISOLATED.TECH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ISOLATED.TECH — We build software.",
    description:
      "Product studio and client web partner. iOS/macOS apps plus conversion-focused websites.",
    images: ["/og-image.png"],
    creator: "@codybontecou",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Script to prevent flash of wrong theme
const themeScript = `
  (function() {
    const stored = localStorage.getItem('isolated-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' ? 'light' 
      : stored === 'dark' ? 'dark' 
      : (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ISOLATED.TECH Apps"
          href="/feed.xml"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ISOLATED.TECH Updates"
          href="/feed/updates.xml"
        />
        <link
          rel="alternate"
          type="application/json"
          title="ISOLATED.TECH Agentic Commerce Catalog"
          href="/api/acp/feed"
        />
      </head>
      <body>
        <ThemeProvider>
          {/* Noise overlay */}
          <div className="noise" />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
