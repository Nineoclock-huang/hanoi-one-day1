# Mobile AI function (Tencent SCF)

The production browser is still hosted by GitHub Pages. Desktop requests use the existing Cloudflare Worker. Mobile requests use the Tencent SCF Function URL. Synthetic `/chat`, `/report`, and `/market` requests were verified end to end before frontend release.

`direct.mjs` adapts the existing Worker logic to Tencent's Node.js event-function contract. The same café and market prompts, input validation, report scoring, and checked language library are bundled into a single `index.mjs`. The DeepSeek key is read at runtime from the function's private `DEEPSEEK_API_KEY` environment variable. Do not put it in source, the ZIP, the frontend, or GitHub Actions.

To rebuild the deployment ZIP on this Windows workspace, run `scripts/build-tencent-ai.ps1`. Upload the generated `tencent/ai/dist/ai-function.zip` as a local ZIP package to the function and keep the handler as `index.main_handler`. The function requires Node.js 20.19, public outbound network access, and a 25-second execution timeout. Test `/health`, `/chat`, `/report`, and `/market` before publishing a frontend routing change.

`index.mjs` is the earlier credential-free bridge experiment. Tencent could not reach the Cloudflare `workers.dev` host, so do **not** deploy it for player traffic. `direct.mjs` calls DeepSeek directly instead.
