# Deployment: Render + Cloudflare Pages + Neon

## Target architecture

- Database: Neon Postgres (managed)
- Backend API: Render Web Service (Docker)
- Frontend: Cloudflare Pages (Vite static build)

## 1) Deploy backend to Render

### Option A: Blueprint (`render.yaml`)

1. In Render: **New +** -> **Blueprint**.
2. Select this repository.
3. Render will detect `render.yaml` and create `pulseboard-api`.
4. Set env vars in Render service:
   - `DATABASE_URL` = Neon connection string (`...sslmode=require`)
   - `JWT_SECRET_KEY` = strong random secret
   - `CORS_ORIGINS` = Cloudflare Pages production URL (e.g. `https://pulseboard-ui.pages.dev`)
   - `TELEGRAM_BOT_TOKEN` = token from BotFather
   - `TELEGRAM_BOT_USERNAME` = bot username (without `@`)
   - `TELEGRAM_WEBHOOK_SECRET` = random secret string
5. Deploy and wait for health check `GET /health` to pass.

### Option B: Manual service

- Runtime: Docker
- Root directory: `backend`
- Health check path: `/health`
- Same env vars as above.

### Configure Telegram webhook

After backend deploy, set webhook in Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://<your-render-backend>.onrender.com/api/v1/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```

## 2) Deploy frontend to Cloudflare Pages

1. Cloudflare Dashboard -> **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
2. Choose repository and branch `main`.
3. Build config:
   - Framework preset: `Vite`
   - Root directory: `frontend`
   - Build command: `npm ci && npm run build`
   - Build output directory: `dist`
4. Environment variable (Production + Preview):
   - `VITE_API_BASE_URL=https://<your-render-backend>.onrender.com/api/v1`
5. Deploy.

`frontend/public/_redirects` already includes SPA fallback:

```text
/* /index.html 200
```

## 3) Post-deploy checks

1. Open backend docs: `https://<render-backend>.onrender.com/docs`
2. Open frontend URL: `https://<cloudflare-project>.pages.dev`
3. Register user, confirm in Telegram bot, login.
4. Create group/session and set RSVP from UI.

## Notes

- Render free web services can sleep after inactivity (cold start on next request).
- Neon remains persistent and independent from app restarts/redeploys.
- If CORS errors appear, update `CORS_ORIGINS` on Render with exact Cloudflare Pages URL.
