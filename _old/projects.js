/* ============================================
   PROJECTS REGISTRY
   ============================================
   To add a new project:
   1. Add an entry to this array
   2. Drop a viewport screenshot into assets/screenshots/<slug>.jpg
   3. That's it — the site picks it up on next load.
   ============================================ */

const PROJECTS = [
  {
    slug: 'imghost',
    name: 'imghost',
    title: 'UPLOAD. SHARE. DONE.',
    description: 'Brutal image hosting for iOS. No fluff, no friction. Share images and get instant, direct links.',
    url: 'https://imghost.isolated.tech',
    screenshot: 'assets/screenshots/imghost.jpg',
    platforms: ['web', 'ios'],
  },
  {
    slug: 'healthmd',
    name: 'health.md',
    title: 'Apple Health → Markdown',
    description: 'Export your Apple Health data directly to Markdown files in your iOS file system. On-device. Private. Automated.',
    url: 'https://healthmd.isolated.tech',
    screenshot: 'assets/screenshots/healthmd.jpg',
    platforms: ['web', 'ios'],
  },
  {
    slug: 'syncmd',
    name: 'sync.md',
    title: 'Git on your iPhone',
    description: 'Real Git on your iPhone. Clone, pull, commit & push any repo. No terminal, no keys layer, no lock-in.',
    url: 'https://syncmd.isolated.tech',
    screenshot: 'assets/screenshots/syncmd.jpg',
    platforms: ['web', 'ios'],
  },
  {
    slug: 'voxboard',
    name: 'Voxboard',
    title: 'Your voice. Your keyboard.',
    description: 'On-device voice transcription that works in any text field. Private. No cloud. No network required.',
    url: 'https://voxboard.isolated.tech',
    screenshot: 'assets/screenshots/voxboard.jpg',
    platforms: ['web', 'ios'],
  },
  {
    slug: 'ugc',
    name: 'ugc.community',
    title: 'We build your website. You create content.',
    description: 'Portfolio platform for UGC creators. Custom sites, zero hosting friction, built-in analytics and contact forms.',
    url: 'https://ugc.community',
    screenshot: 'assets/screenshots/ugc.jpg',
    platforms: ['web'],
  },
  {
    slug: 'i18n',
    name: 'i18n',
    title: 'Local + Effortless i18n Translation',
    description: 'Translate your application\'s content into multiple languages with a local AI-powered translation tool. No cloud. No API keys. Just ship.',
    url: 'https://i18n.isolated.tech',
    screenshot: 'assets/screenshots/i18n.jpg',
    platforms: ['web'],
  },
  {
    slug: 'talasofilia',
    name: 'Talasofilia Pilates',
    title: 'Discover Your Strength Within',
    description: 'Modern Pilates studio website for Talasofilia in Puerto Escondido. Class booking, pricing, and a clean design focused on mindful movement.',
    url: 'https://talasofiliapilates.com',
    screenshot: 'assets/screenshots/talasofilia.jpg',
    platforms: ['web'],
  },
];
