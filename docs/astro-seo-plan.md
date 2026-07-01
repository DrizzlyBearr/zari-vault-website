# Zari Vault - Astro Migration & SEO Content Plan

Goal: drive as much organic search traffic as possible to the site and convert it
into app installs, using a content architecture that scales to hundreds of pages.

## Why Astro (not React SPA, not one hand-coded HTML file)

- A **React SPA is poor for SEO**: content is client-rendered, so crawlers must run
  JS to see it - slower and less reliable to index. (The Millionaire Contracts
  blueprint itself flags "pre-render HTML at build time" as the real fix.)
- The **current single `index.html`** is fine for one marketing page but does not
  scale: every new page would need the head/nav/footer copied by hand.
- **Astro pre-renders every page to static HTML at build time** (great for crawlers
  and Core Web Vitals), ships ~zero JS by default, supports Markdown/MDX blogging,
  gives per-page meta/OG/schema, auto-generates the sitemap, and lets us port the
  existing homepage design unchanged. Deploys on Vercel exactly like today.

## Prerequisites

- Merge PR #1 and set the Vercel env vars first (keeps the migration a clean,
  separate change).
- The existing `/api/submit` Vercel function stays as-is; Astro coexists with the
  `/api` directory on Vercel (add `@astrojs/vercel` adapter only if we later need
  server rendering - the marketing/blog pages should stay static).

## Phase 1 - Migrate the existing site to Astro (design unchanged)

- Scaffold Astro: `src/pages/`, `src/layouts/`, `src/components/`, `public/`.
- `BaseLayout.astro` holds the `<head>` (meta, OG, Twitter, JSON-LD, hreflang,
  fonts), the nav, and the footer as components.
- Port `index.html` → `src/pages/index.astro` (keep the current long single-page
  layout and its `#home/#about/#services/...` anchors so no internal links break).
- Port `privacy.html` → `src/pages/privacy.astro`. Add a Vercel redirect
  `/privacy.html → /privacy` so existing links (footer, POPIA banner) keep working.
- Move the big inline `<style>` block into a shared stylesheet imported by the layout.
- Reusable `<Seo>` component: per-page title, description, canonical, OG image.
- `@astrojs/sitemap` for the sitemap; keep robots.txt, hreflang en-ZA, canonical,
  Organization/SoftwareApplication schema.
- Move assets (og-image.png, and later the logo) into `public/`, reference locally,
  and add `<link rel="preload" as="image">` for the logo (blueprint 2c).
- Verify parity: visual diff of the homepage + a Lighthouse pass before/after.

## Phase 2 - Blog (the traffic engine)

- Astro **content collection** `src/content/blog/*.md(x)` with a typed frontmatter
  schema (title, description, publishDate, updatedDate, tags, cover, canonical).
- Blog index (`/blog`) + post template (`/blog/[slug]`) with **Article +
  BreadcrumbList** JSON-LD, author, published/updated dates, and a strong CTA to the
  app + waitlist.
- RSS feed via `@astrojs/rss`.
- **Launch set (8-12 posts)** targeting South African search intent, e.g.:
  - How to apply for a Smart ID card in South Africa (step by step)
  - Driver's licence renewal in South Africa: dates, costs, documents
  - What documents do you need for FICA? (banks/insurers)
  - Lost your ID? How to get a temporary ID certificate
  - What documents must you carry at a roadblock?
  - Passport application & renewal in South Africa
  - Vehicle licence disc renewal: how and where
  - Is a digital copy of your ID legally accepted in South Africa?
  - POPIA explained in plain language (and what it means for your documents)
  - How to keep your identity documents safe from theft/loss
- Each post links to relevant app features (topic-cluster internal linking) and to a
  pillar guide: "The complete guide to South African identity documents".

## Phase 3 - Programmatic country landing pages (149 countries)

- Data file (`src/data/countries.ts`) mapping each supported country to its local
  document names (e.g. SA Smart ID → Aadhaar in India, BRP in the UK, National ID in
  Kenya) plus any per-country notes.
- `getStaticPaths` generates `/vault/[country]` (and optionally per-document
  variants) from the data - hundreds of indexable pages from one template.
- Template: localized H1/intro, the document types for that country, security copy,
  schema, internal links, and the download CTA. Add all to the sitemap.
- Captures large volumes of long-tail geo queries with little competition.

## Phase 4 - On-page & technical SEO

- Article / BreadcrumbList / FAQ schema where relevant.
- Pillar-and-cluster internal linking for topical authority.
- Astro `<Image>` for responsive, optimized images.
- Per-page titles/descriptions/OG; keep pages fast (static, minimal JS).

## Phase 5 - Off-page / backlinks (ongoing, non-code)

Backlinks are **earned**, not pages you build on your own site:
- Submit to app-review sites and SA startup/tech directories.
- Launch on Product Hunt.
- Digital PR to SA tech/consumer media (the privacy/POPIA angle is a good hook).
- Partnerships that link back: estates, driving schools, universities, insurers.
- Build link-worthy assets: the document guides above, original stats, a free tool.

## Notes & expectations

- SEO compounds over **months** (content + links), not overnight. The architecture
  is what makes the content machine possible and maintainable.
- Keep the output static and JS-light; do not turn this into a heavy SPA.
- Redirects matter: preserve existing URLs and anchors to avoid losing any equity.

## Rough effort

- Phase 1 (migration + parity): the bulk of the setup work.
- Phase 2 (blog framework + first posts): framework is quick; writing posts is
  ongoing.
- Phase 3 (country generator): moderate once the data file exists.
- Phases 4-5: continuous.

Tracked as tasks #14 (architecture decision), #16 (blog), #17 (country pages),
#18 (backlinks).
