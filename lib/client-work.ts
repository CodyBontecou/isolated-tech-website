export interface ClientWorkCaseStudy {
  slug: string;
  client: string;
  headline: string;
  summary: string;
  primaryUrl: string;
  previewImage: string;
  services: string[];
  outcomes: string[];
  stack: string[];
  before?: {
    label: string;
    url: string;
    previewImage: string;
  };
  after?: {
    label: string;
    url: string;
    previewImage: string;
  };
}

export const CLIENT_WORK: ClientWorkCaseStudy[] = [
  {
    slug: "roofbrite",
    client: "Roof Brite Hawaii",
    headline: "From dated local-business site to high-trust conversion funnel.",
    summary:
      "A full redesign focused on service clarity, trust signals, and a mobile-first inquiry flow for a pressure washing and roof treatment business.",
    primaryUrl: "https://roofbrite.vercel.app/",
    previewImage: "/assets/screenshots/roofbrite.jpg",
    services: ["Positioning", "Web Design", "Copy Architecture", "Frontend Build"],
    outcomes: [
      "Sharper service hierarchy with clear intent on every section",
      "Improved local trust framing through social proof and visual consistency",
      "Lead-first page structure with clearer paths to contact"
    ],
    stack: ["Next.js", "Vercel", "Responsive UI"],
    before: {
      label: "Legacy site",
      url: "https://www.roofbritehawaii.com/",
      previewImage: "/assets/screenshots/roofbrite-legacy.jpg"
    },
    after: {
      label: "New site",
      url: "https://roofbrite.vercel.app/",
      previewImage: "/assets/screenshots/roofbrite.jpg"
    }
  },
  {
    slug: "talasofilia",
    client: "Talasofilia Pilates",
    headline: "Editorial minimalism for a boutique wellness brand.",
    summary:
      "A polished studio website that balances calm aesthetics with practical booking and pricing navigation for new students.",
    primaryUrl: "https://talasofiliapilates.com/",
    previewImage: "/assets/screenshots/talasofilia.jpg",
    services: ["Brand Translation", "Information Architecture", "UI Design", "Development"],
    outcomes: [
      "Clear service and class pathing for first-time visitors",
      "Elevated visual language aligned with premium studio positioning",
      "Fast-loading layout optimized for mobile discovery"
    ],
    stack: ["Custom Frontend", "Responsive Design", "SEO Foundations"]
  }
];

export const CLIENT_WORK_STATS = {
  projectsCompleted: CLIENT_WORK.length,
  industries: "Home Services, Wellness",
  deliveryModel: "Design + Build"
};
