# Handiz Shop (API)

Shop REST routes are mounted at `/api/v1/shop/*` (see `routes/shopRoutes.js`).

For monorepo setup, local dev, and Docker, see the root [README.md](../README.md).

## Environment

| Variable                        | Required          | Description                                                                                                           |
| ------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `HANDIZ_SITE_URL`               | Recommended       | Public site origin; used for default Whish shop redirect URLs and notifications                                       |
| `SHOP_SHIPPING_FEE_USD`         | No (default `0`)  | Flat USD shipping added server-side at checkout                                                                       |
| `WHISH_SHOP_SUCCESS_URL`        | No                | Post-payment redirect; `{orderId}` placeholder. Defaults to `{HANDIZ_SITE_URL}/shop/orders/{orderId}?payment=success` |
| `WHISH_SHOP_CANCEL_URL`         | No                | Failed/cancel redirect; same placeholder rules                                                                        |
| `WHISH_CHANNEL`, `WHISH_SECRET` | For paid checkout | Same Whish Pay integration as course checkout                                                                         |

Course Whish URLs (`WHISH_SUCCESS_URL`, `WHISH_CANCEL_URL`) are unchanged. Webhooks at `/api/v1/webhooks/whish/*` fulfill **either** course orders or shop orders by `whishExternalId`.

Copy new keys from `.env.example` into `.env` (dotenv-safe validates against the example file).

## Docker

`docker-compose.yml` loads `server/.env` into the API container. No extra compose variables are required for shop beyond the server env file.

## Admin UI

Dashboard: **Shop** menu → Products (`/ecommerce/products`), Categories, Orders.

Permissions: `shop:manage`, `shop:orders:read`, `shop:orders:manage` (Admin).

## Server cart (authenticated)

MongoDB model `ShopCart` — one cart per user (`userId` unique). Guest browsing uses browser `localStorage` on the storefront; on login, `POST /shop/cart/merge` combines guest lines into the server cart.

| Method | Path                          | Description                                         |
| ------ | ----------------------------- | --------------------------------------------------- |
| GET    | `/shop/cart`                  | Enriched cart (prices, stock, issues)               |
| PUT    | `/shop/cart`                  | Replace cart `{ items: [{ productId, quantity }] }` |
| POST   | `/shop/cart/items`            | Add/update line `{ productId, quantity }`           |
| PATCH  | `/shop/cart/items/:productId` | Set quantity (`0` removes)                          |
| DELETE | `/shop/cart/items/:productId` | Remove line                                         |
| POST   | `/shop/cart/merge`            | Merge guest items into server cart                  |
| POST   | `/shop/cart/validate`         | Pre-checkout validation                             |
| DELETE | `/shop/cart`                  | Clear cart                                          |

**Checkout** (`POST /shop/checkout`) reads **only the server cart** for the authenticated user (client-submitted line items are ignored). Cart is cleared after a Whish session is created successfully.

Carts expire after 60 days without updates (TTL on `updatedAt`).

## Public storefront

Next.js app (`handiz`): `/shop`, `/shop/products`, cart, checkout. Uses `NEXT_PUBLIC_API_URL` and cookie auth for cart/checkout APIs.
