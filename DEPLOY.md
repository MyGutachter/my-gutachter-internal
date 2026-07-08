# Deployment — `my-gutachter-internal`

Single Spring Boot backend + single React (Vite) frontend + MongoDB. Dev and prod
are the **same images**; the environment is selected by `SPRING_PROFILES_ACTIVE`
(`dev` → OMT dev server, `prod` → OMT prod server) — mirroring OMT's two-server
layout (Decision Q11).

## Architecture

```
browser ──▶ nginx (frontend image, :80)
              ├─ /            → SPA (static)
              ├─ /api/…       → proxy → backend:8080   (REST)
              └─ /signal      → proxy → backend:8080   (WebRTC signaling, WS upgrade)
backend (Spring Boot :8080) ──▶ mongo:27017,  S3,  OMT (outbound only),  Mailgun/Twilio/DAT
```

Same-origin by default (nginx proxies `/api` and `/signal`), so there's no CORS and
the WebSocket works through one host. OMT **pushes** orders to `POST /api/orders/import`
(API-key auth); the app never pulls.

## Quick start (local / dev, docker compose)

```bash
cp .env.example .env         # ships a DEV-ONLY JWT_SECRET so it boots; fill the rest
docker compose up --build
# open http://localhost:8088
```

> Two secrets are needed just to **boot** (both built at startup): `JWT_SECRET`
> (non-blank base64 key ≥256 bits — JJWT rejects blank) and the AWS credentials
> (the S3 client rejects a blank access key). `.env.example` ships a dev-only
> `JWT_SECRET` and `dummy` AWS creds so `cp .env.example .env` boots — **change
> both in prod.** The rest (DAT/Mailgun/Twilio/OMT) may stay blank for a smoke
> test; they're only used when those features are exercised.

- Mongo runs in-compose with a named volume (`mongo-data`); only the frontend port
  is published. Uncomment the `ports:` blocks in `docker-compose.yml` to reach the
  backend (`:8080`) or mongo (`:27017`) from the host.
- Switch to prod wiring by setting `SPRING_PROFILES_ACTIVE=prod` in `.env`.

## Manual build (no compose)

**Backend** (needs JDK 17 — the machine default may be JDK 11):
```bash
cd backend
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 mvn -q -DskipTests package
SPRING_PROFILES_ACTIVE=dev java -jar target/my-gutachter-internal-1.0.0.jar
```
or `docker build -t mgi-backend ./backend`.

**Frontend** (use **npm**, not yarn):
```bash
cd frontend
npm ci && npm run build     # VITE_API_URL is baked in at build time
```
or `docker build -t mgi-frontend --build-arg VITE_API_URL=/api ./frontend`.

## Two-server prod (dev + prod)

Run the stack once per environment. Everything is env-driven; the only per-env
differences are the profile and the secrets:

| Setting | dev | prod |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` | `prod` |
| OMT server (from the profile) | `backend.dev.omt-mygutachter.com` | `backend.omt-mygutachter.com` |
| `MONGODB_URI` | dev cluster | prod cluster |
| secrets (JWT/AWS/DAT/Mailgun/Twilio/OMT) | dev values | prod values |

Per-order routing to the correct OMT server is by the order's `source`
(`OMT`/`OMT_DEV`) for outbound UVV calls — independent of the active profile.

### Separate API host (instead of same-origin)

If the API is served from its own host (e.g. `api.<env>.omt-mygutachter.com`):

1. Build the frontend with `--build-arg VITE_API_URL=https://api.<env>…/api`
   (the `/signal` WS URL is derived from that host).
2. Drop the `/api` and `/signal` proxy blocks in `frontend/nginx.conf`.
3. Ensure the backend's CORS allows the frontend origin, and its ingress forwards
   the WebSocket upgrade for `/signal`.

## Configuration / secrets

- Root `.env` (compose): copy from `.env.example`. Feeds the backend via `env_file`
  plus the compose-level vars (`SPRING_PROFILES_ACTIVE`, `FRONTEND_PORT`,
  `VITE_API_URL`, `MONGODB_DATABASE`).
- `backend/.env.example` documents the backend vars for running the jar directly.
- **Never commit real secrets** — `/.env`, `backend/.env`, `frontend/.env` are
  git-ignored; the source repos hold the real values.
- Multipart is capped at 500MB (video recordings); nginx mirrors this
  (`client_max_body_size 500M`).

## Health check

- Backend: `GET /` (returns 200/permit-all) — used as a readiness probe.
- After boot, verify the OMT push path: `POST /api/orders/import` with the
  `X-API-KEY` header returns 200 for a valid key.
