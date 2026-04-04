# Deployment Guide

This document provides step-by-step instructions to deploy the backend (Express/API) and frontend (Next.js) using Render (backend) and Vercel (frontend). Adjust if you use other providers.

**Prerequisites**
- Git repo connected to GitHub/GitLab
- Render account (for backend) and Vercel account (for frontend)
- Secrets ready (do not commit `.env` with real secrets)

**Files added**
- `backend/.env.development.example` — local dev template
- `backend/.env.production.example` — production template (placeholders)
- `frontend/.env.development.example` — frontend dev template
- `frontend/.env.production.example` — frontend prod template

--------------------------------------------------------------------------------
**1) Backend — Render (recommended)**

1. In Render dashboard: New → Web Service → Connect a repository.
2. Select your repository and branch.
3. IMPORTANT: set the "Root Directory" to `backend` (so Render builds the backend folder).
4. Build command: `npm install` (Render will run this inside `backend`).
5. Start command: `npm start` (this runs `node server.js` as defined in `backend/package.json`).
6. Set Environment variables (in Render web service -> Environment). Add the values from `backend/.env.production.example` such as:

```
MONGODB_URI=<YOUR_PROD_MONGODB_URI>
JWT_ACCESS_SECRET=<PROD_JWT_ACCESS_SECRET>
JWT_REFRESH_SECRET=<PROD_JWT_REFRESH_SECRET>
FRONTEND_URL=https://your-frontend-domain.com
CLOUDINARY_CLOUD_NAME=<...>
CLOUDINARY_API_KEY=<...>
CLOUDINARY_API_SECRET=<...>
EMAIL_PROVIDER=gmail_api
GMAIL_CLIENT_ID=<...>
GMAIL_CLIENT_SECRET=<...>
GMAIL_REFRESH_TOKEN=<...>
GMAIL_SENDER_EMAIL=<...>
API_URL=https://your-backend-domain.com
BACKEND_URL=https://your-backend-domain.com
ENABLE_CRON_JOBS=true
ENABLE_ANALYTICS=true
```

7. Choose the Node version (Render will respect `engines.node` from `backend/package.json` — ensure >=18).
8. Deploy and monitor logs. Test endpoints like `https://your-backend-domain.com/api/docs` or `/health`.

Notes for Render CLI / advanced:
- You can configure `render.yaml` for infra as code, or use the dashboard.

--------------------------------------------------------------------------------
**2) Frontend — Vercel**

1. In Vercel: Import Project → select this repo.
2. Set Root Directory to `frontend` so Vercel builds the Next.js app.
3. Framework Preset: Next.js (auto-detected). Build command: `npm run build` (default). Output: default.
4. Add Environment Variables in Vercel (Production): copy values from `frontend/.env.production.example` and set:

```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
NEXTAUTH_URL=https://your-frontend-domain.com
NEXTAUTH_SECRET=<PROD_NEXTAUTH_SECRET>
```

5. (If you use analytics, Sentry, Mapbox, etc.) set `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
6. Deploy. Verify server-side auth pages by visiting the site and sign-in flows.

Notes:
- NextAuth requires `NEXTAUTH_URL` and `NEXTAUTH_SECRET` set in Vercel for server-side sessions.

--------------------------------------------------------------------------------
**3) Local testing before deploy**

- Backend (from repo root):

```bash
cd backend
cp .env.development.example .env   # fill values
npm install
npm run dev    # uses nodemon
```

- Frontend (from repo root):

```bash
cd frontend
cp .env.development.example .env.local   # fill values
npm install
npm run dev
```

Test flows: register (OTP), forgot-password (OTP), and any email-triggering action to confirm Gmail API sends.

--------------------------------------------------------------------------------
**4) Remove secrets from Git history and ensure `.env` is ignored**

If you accidentally committed `.env`, remove it from the repo and add to `.gitignore`:

```bash
# remove tracked file
git rm --cached backend/.env
git commit -m "remove local backend .env from repo"
git push

# add or verify .gitignore contains
echo "backend/.env" >> .gitignore
```

If secrets were pushed, rotate them (DB password, Gmail refresh token, Cloudinary keys, JWT secrets).

--------------------------------------------------------------------------------
**5) Tips & troubleshooting**
- If Render blocks SMTP ports, `EMAIL_PROVIDER=gmail_api` + Gmail OAuth refresh token is the reliable option.
- Monitor server logs on Render and Vercel; check the Gmail API quota and refresh token validity.
- Ensure CORS and `FRONTEND_URL` values match your deployed frontend domain.
- For websockets, use `NEXT_PUBLIC_WS_URL` pointing at your backend; if using Cloud providers, ensure your socket server is reachable and supports sticky sessions or use a managed socket layer.

--------------------------------------------------------------------------------
If you want, I can now:

- (A) Replace your `backend/.env` with a production-only template (removing secrets), or
- (B) Commit the example files and the DEPLOYMENT.md (already done), or
- (C) Walk through the Render + Vercel setup interactively.
