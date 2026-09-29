# Handiz Dashboard (API + Admin)

Express API and Vite/React admin for Handiz: CMS, LMS, and **Shop** management. The public marketing site and storefront live in the separate **handiz** Next.js repository.

## Repositories

| App                              | Role                                | Default local URL                                              |
| -------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| **handiz-dashboard** (this repo) | API `:5016`, admin UI `:5173`       | API `http://localhost:5016`, dashboard `http://localhost:5173` |
| **handiz**                       | Public website + `/shop` storefront | `http://localhost:3000`                                        |
| **handiz-lms**                   | Course learning (optional)          | `http://localhost:3001`                                        |

## Local development

### API server

```bash
cd server
cp .env.example .env   # fill secrets; keep keys in sync with .env.example (dotenv-safe)
npm install
npm start              # PORT 5016
```

### Admin client

```bash
cd client
cp .env.example .env
npm install
npm run dev            # Vite, typically :5173
```

`VITE_API_BASE_URL` must point at the API (e.g. `http://localhost:5016/api/v1/`).

## Docker

From the repo root:

```bash
cp server/.env.example server/.env
cp .env.example .env
docker compose up --build
```

- API: `http://127.0.0.1:5016`
- Admin (nginx): `http://127.0.0.1:3016`

Shop-related configuration is read from **`server/.env`** only (no extra compose variables).

## Environment files

| File                  | Purpose                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `server/.env`         | API secrets, MongoDB, GCS, Whish, **shop** (`SHOP_SHIPPING_FEE_USD`, `WHISH_SHOP_*`), `HANDIZ_SITE_URL` |
| `server/.env.example` | Template; all keys here must exist in `.env`                                                            |
| `.env` (root)         | Docker build args for the admin client (`VITE_*`)                                                       |
| `client/.env`         | Local Vite dev (`VITE_*`)                                                                               |

See `server/config/env.js` for required vs optional keys.

## Shop

- **API:** `/api/v1/shop/*` (products, categories, checkout, orders).
- **Admin:** Dashboard → **Shop** → Products, Categories, Orders (`/ecommerce/products`, `/ecommerce/shop/categories`, `/ecommerce/shop/orders`).
- **Storefront:** Handiz site `/shop` (uses `NEXT_PUBLIC_API_URL` on the Next app).

Detailed API env, webhooks, and permissions: **[server/SHOP.md](server/SHOP.md)**.

Production reminders:

1. Set `HANDIZ_SITE_URL` to the public site origin.
2. Set `SHOP_SHIPPING_FEE_USD` and optional `WHISH_SHOP_SUCCESS_URL` / `WHISH_SHOP_CANCEL_URL` (see `server/.env.example`).
3. Whish credentials (`WHISH_CHANNEL`, `WHISH_SECRET`) for paid checkout—shared with course payments; webhooks distinguish course vs shop orders by `whishExternalId`.

## Health check

`GET /health` → `{ "status": "ok" }`
