# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OsonBiznes — SaaS CRM for small Uzbek shops (POS, stock, nasiya/debt book, customers, invoices, Telegram orders) plus **OsonBozor**, a public marketplace of opted-in shops. Revenue = monthly subscriptions (trial → start/pro/business). UI copy and code comments are mostly Uzbek (Latin).

Four independent parts, talking only over REST:

| Dir | Stack | Role |
|---|---|---|
| `backend/` | Express 4 + Mongoose 8 (CommonJS, plain JS) | API at `/api/*`, cron jobs, image uploads |
| `frontend/` | React 18 + Vite 5 + Tailwind 3 + i18next (JSX, no TS) | Shop-owner app, admin panel, public OsonBozor |
| `telegram-bot/` | python-telegram-bot | Customer-facing ordering bot, uses public `/api/telegram/*` |
| `agent/` | Hermes Agent profile + MCP server | AI sales agent selling subscriptions over Telegram |

`database/schema.sql` / `seed.sql` are legacy Postgres — **not used**; the data model is `backend/src/models/*.js`.

## Commands

```bash
# Backend (needs JWT_SECRET >= 16 chars or it exits immediately)
cd backend && npm install && npm run dev          # nodemon server.js
# Local run without touching the real DB in backend/.env (empty MONGODB_URI => in-memory Mongo + auto demo seed):
MONGODB_URI= NODE_ENV=development PORT=5001 JWT_SECRET=local-test-secret-0123456789abcdef node server.js

# Frontend — vite.config.js proxies /api and /uploads to localhost:5001, dev port 3001
cd frontend && npm install && npm run dev
npm run build

# Telegram bot
cd telegram-bot && pip install -r requirements.txt && python bot.py   # TELEGRAM_BOT_TOKEN, API_URL

# AI sales agent (creates/updates ~/.hermes/profiles/osonbiznes-sales)
bash agent/install.sh

# Docker stack (mongo + backend + nginx frontend + bot)
docker compose -f deploy/docker-compose.yml up -d --build
```

There is no test suite, linter config, or CI. Verify changes by running backend + frontend and exercising flows (curl against the API or Playwright against the UI). Demo accounts seeded in dev: `admin@osonbiznes.uz / Admin123!`, `demo@osonbiznes.uz / demo123`, `bobur@osonbiznes.uz / bobur123`.

A PostToolUse formatter hook reformats files written via Write/Edit (adds semicolons/double quotes), so files touched that way differ in style from the rest — re-read before follow-up edits.

## Architecture — things that span multiple files

**Multi-tenancy.** Every business document (`Product`, `Order`, `Customer`, `Invoice`, `Notification`, `Card`, `Payment`) has `userId` = the shop owner. Every owner route must filter by `userId: req.user.id`. Note `req.user.id` is an **ObjectId**, not a string — compare with `.equals()` / `.toString()`.

**Auth & plan gating** (`src/middleware/`): `authenticate` (JWT Bearer, token kept in frontend `localStorage`) → `requireActiveSubscription` (402 when trial/subscription expired; based on the `User.tariffStatus` virtual) → `enforceLimit('products'|'customers')` using `src/config/planLimits.js`. Admin routes use `requireAdmin`. Plan limits in `planLimits.js` must stay consistent with the feature lists in `src/config/billing.js` and `frontend/src/pages/Subscription.jsx`.

**Billing (`src/config/billing.js` is the single source of prices).** There is no payment gateway integration. Flow: shop owner transfers money to the card from env `PAYMENT_CARD_*` → `POST /api/subscription/request` creates a `pending` Payment (`method: 'transfer'`, reference code, `metadata.{billingCycle,durationDays,payerCardLast4}`) → admin approves via `PUT /api/admin/payments/:id/approve` (atomic `pending→success`, extends existing subscription end). Users can never activate a tariff themselves — keep it that way.

**Stock** goes only through `src/services/stock.js` (`reserveStock` / `releaseStock`): atomic `stock >= qty` conditional pipeline updates that also recompute `Product.status` (`pre('save')` does not run on `updateOne`), all-or-nothing rollback. Order create/cancel/un-cancel/delete in `routes/orders.js` also adjust `User.totalRevenue` and nasiya `Customer.debt` via `applyOrderEffects`. `User.total*` counters are denormalized `$inc` stats.

**Public surface** (no auth): `/api/marketplace/*`, `/api/telegram/*` (bot + marketplace cart checkout both POST `/api/telegram/order`), `/api/subscription/plans`, `/api/support`. Visibility rule lives in `src/services/publicShops.js#getPublicShopIds` (ShopProfile.showOnMarketplace + active user + non-expired tariff) — use it for anything public. Never expose owner email. Public orders take price from DB, never from the client, and are always `payment: 'unpaid'`.

**DB bootstrap** (`src/config/db.js`): dev falls back to `mongodb-memory-server` and seeds demo data; production (`NODE_ENV=production`) requires `MONGODB_URI`, never falls back, never seeds demo data unless `SEED_DEMO=true`, and creates the first admin only from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (>=12 chars). Indexes are created in `src/config/indexes.js` after connect. Cron jobs (trial reminders, expiry notices, overdue invoices) live in `server.js`.

**CORS** (`server.js`): allowlist = `FRONTEND_URL` (+www) + `CORS_ORIGINS`; localhost only outside production. On Render the frontend is a separate origin, so `FRONTEND_URL` must match it exactly.

**Frontend**: `src/services/api.js` is the single API client (`VITE_API_URL`, default relative `/api`; 401 → clears token and redirects to `/login`). Routes in `App.jsx`: shop-owner pages under `Layout`, `/admin/*` under `AdminLayout`, public `/marketplace*`. Most page text is hard-coded Uzbek; only nav/common strings go through i18next (`src/locales/{uz,ru,en}.json`), so the default language is pinned to `uz`. Shared animation utilities (`stagger`, `lift`, `shine`, `glow-border`, `blob`, `rise-in`) are in `src/index.css` and respect `prefers-reduced-motion`.

**AI sales agent (`agent/`)**: `osonbiznes_mcp.py` is an MCP server (Hermes venv, `mcp.server.mcpserver.MCPServer`) exposing only public-API tools; `install.sh` writes the profile config with `platform_toolsets: [mcp-osonbiznes]` (no terminal/file/web), `group_policy: disabled`, and `gateway.platforms.telegram.skip_context_files: true` (otherwise `~/CLAUDE.md` leaks into customer chats). Persona and positioning ("Uzum/OLX bring buyers; OsonBiznes runs the shop") are in `agent/SOUL.md`. Don't add tools that call authenticated endpoints.

## Deployment

`render.yaml` blueprint (backend web service, static frontend with SPA rewrite, Python worker for the bot) — see `DEPLOY-RENDER.md`. Render free tier disk is ephemeral, so `backend/uploads/` images are lost on redeploy. Required backend env beyond `.env.example` basics: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PAYMENT_CARD_NUMBER/HOLDER/BANK`, optional `AGENT_API_KEY` (raises `/api/support` rate limit for the agent via `x-agent-key`).
