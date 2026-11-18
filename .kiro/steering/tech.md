---
inclusion: always
---

# Technology and repository standards

The core application is a no-build static HTML and JavaScript site deployed to GitHub Pages. Keep the core judge path runnable by opening `index.html` without a bundler. Existing integration modules may use browser ESM imports and external APIs, but they must degrade clearly when unavailable.

Use the existing file boundaries. Keep catalog data in catalog modules, UI behavior in `app.js` and `swap-ui.js`, wallet and session-key wiring in their existing modules, and supporting documentation under `docs/`.

Do not commit `.env`, private keys, API keys, wallet credentials, build artifacts, or dependency directories. Prefer small, focused changes. Preserve the testnet-only safety boundary for blockchain actions.
