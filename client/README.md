# Handiz Admin (client)

Vite + React admin UI for Handiz. It talks to the Express API in `../server`.

**Project docs (setup, Docker, env files, Shop admin):** see [README.md](../README.md) in the repo root. Shop API details: [server/SHOP.md](../server/SHOP.md).

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

| Variable            | Typical local value             |
| ------------------- | ------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:5016/api/v1/` |

Start the API from `../server` before using the dashboard. Shop management: **Shop** menu → Products, Categories, Orders.

## Build

```bash
npm run build
```

Production Docker builds use root `docker-compose.yml` and `.env` `VITE_*` build args (see root README).
