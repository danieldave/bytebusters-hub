# ByteBusters Hub

One home page (`index.html`) that opens every ByteBusters showcase page, teaching guide, practice tool, AI helper and the Report Desk.

## Put it online (once)
1. On vercel.com: **Add New → Project → Import** `bytebusters-hub` from GitHub. Leave every build setting as it is and press **Deploy**.
2. **Settings → Environment Variables**, add:
   - `OPENAI_API_KEY` – your OpenAI key (only ever here, never in a page).
   - `TRAINER_PIN` – a PIN only the trainer knows (for Code Coach trainer view).
   - optional `OPENAI_MODEL` – defaults to `gpt-4o-mini`.
3. **Storage → Upstash → Redis → Create**, then connect it to this project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
4. **Deployments → Redeploy** so the new settings are used.

## How the live features work
| Page | Uses |
|---|---|
| AI Lab, Brain, Code Coach | `claude-shim.js` → `/api/ai` (OpenAI) and `/api/store` (Upstash) |
| Inflation Explainer | `/api/explain` |
| Brain trails, Code Coach progress | `/api/store`, shared by every phone and laptop |

Without a key the AI pages fall back to their sample answers; without Upstash, Brain and Code Coach save on each device only.

**Trainer view in Code Coach:** open `/code-coach/?trainer`, enter the `TRAINER_PIN` once per browser session.

## Report Desk
Open `report-desk/config.js` on GitHub (pencil icon), paste your Google Apps Script web-app URL between the quotes, commit. Vercel republishes in about a minute. Set-up steps: `/report-desk/how-to-set-up.html`.

## Changing things
Edit any file on GitHub (works from the phone) and commit; Vercel redeploys automatically. Each page lives in its own folder, e.g. `scam-shield/index.html`.
