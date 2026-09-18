# Lạc AI Worker

This Cloudflare Worker keeps the DeepSeek key outside the browser. It accepts short cafe conversations from the GitHub Pages site and returns `{ "vi": "...", "zh": "..." }`. The frontend falls back to its local rule engine whenever the Worker or model is unavailable.

Deployment requires a Cloudflare account and the encrypted `DEEPSEEK_API_KEY` secret. Never place the key in source code, GitHub variables, or a `VITE_` variable.
