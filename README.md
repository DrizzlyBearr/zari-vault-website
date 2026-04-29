# Zari Vault Website

A clean, dark-themed landing page for **Zari Vault** — a secure digital vault app.

## Project Structure

```
zari-vault-website/
├── index.html        # Main HTML file
├── css/
│   └── styles.css    # All styles
├── js/
│   └── main.js       # Scroll-to-top, nav highlighting, form handler
└── README.md
```

## Sections

- **Navbar** — Sticky nav with smooth-scroll links
- **Hero** — Full-viewport hero with CTA
- **Features** — 3-column feature cards
- **Pricing** — Free + Premium plan cards (R249.99/year)
- **Reviews** — 3 customer review cards
- **Contact** — Contact form with submit handler
- **Footer** — Copyright

## Tech Stack

- Pure HTML, CSS, JavaScript — no dependencies
- Deployed via [Vercel](https://vercel.com)
- Version controlled on [GitHub](https://github.com)

## Local Development

Open `index.html` directly in your browser, or use a local server:

```bash
npx serve .
```

## Deployment

Push to `main` → Vercel auto-deploys within ~60 seconds.

## Editing with Claude Code

```bash
npm install -g @anthropic-ai/claude-code
cd zari-vault-website
claude
```

Then describe changes in plain English. Push when done:

```bash
git add .
git commit -m "your change description"
git push
```
