# Lạc AI Worker

This Cloudflare Worker keeps the DeepSeek key outside the browser. It accepts short cafe conversations from the GitHub Pages site and returns `{ "vi": "...", "zh": "..." }`. The frontend falls back to its local rule engine whenever the Worker or model is unavailable.

Deployment requires a Cloudflare account and the encrypted `DEEPSEEK_API_KEY` secret. Never place the key in source code, GitHub variables, or a `VITE_` variable.

Cafe dialogue and language feedback use the source-checked library in `public/knowledge/cafe.json`. A bundled snapshot works immediately; a background refresh picks up the version published on GitHub Pages after the weekly source check. The refresh is bounded and does not delay a player's response. See `knowledge/README.md` for provenance and update rules.
