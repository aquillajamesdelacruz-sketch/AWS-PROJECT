# Shopee / Lazada / TikTok Shop product importer

This implementation extends the existing React + Firebase + Render project. Existing watchlist, collection, dashboard and purchase flows remain in place; imported fields are passed through the existing `onSave` callback and saved with the existing item record.

## What is imported

The importer now normalizes: name, current price, original price, primary image and image list, description, variations, available stock, seller, rating, review count, source URL, marketplace and retrieval method. Marketplace pages often hide some fields; unavailable values remain blank/null and the confirmation form is editable.

## Retrieval order

1. **Official partner API** when configured and authorized.
2. **Public metadata reader** as fallback (JSON-LD, Open Graph and readable embedded structured JSON).
3. Manual confirmation/editing for fields not exposed by the page.

The backend never logs in as a user or bypasses CAPTCHA, bot protection, paywalls, or marketplace restrictions.

## Official API configuration

Because official API access is account/partner-specific, this repository does not invent marketplace endpoints or signatures. Obtain approved API access and deploy a small adapter endpoint for each marketplace that accepts `?url=<product-url>` and returns a normalized JSON object. Set these Render environment variables:

- `SHOPEE_PRODUCT_API_URL`, `SHOPEE_API_TOKEN`
- `LAZADA_PRODUCT_API_URL`, `LAZADA_API_TOKEN`
- `TIKTOK_PRODUCT_API_URL`, `TIKTOK_API_TOKEN`

The configured endpoint must accept `Authorization: Bearer <token>` and return either the product object directly or `{ "data": { ...product fields... } }` using this shape:

```json
{
  "name": "Product name",
  "price": 1299,
  "originalPrice": 1599,
  "images": ["https://..."],
  "description": "Description",
  "variations": [{"name":"Color","options":["Black","White"]}],
  "stock": 20,
  "seller": "Shop name",
  "rating": 4.8,
  "reviewCount": 120
}
```

Keep API tokens only in Render environment variables. Never put them in `VITE_*` variables or React source code. The server falls back to metadata reading if an official adapter is not configured or fails.

## Local development

1. `npm install`
2. Terminal 1: `npm run server`
3. Terminal 2: `npm run dev`
4. Paste a public Shopee, Lazada, or TikTok Shop product URL in Add Item.

## Render

Deploy the existing Node web service using `render.yaml`. Set `ALLOWED_ORIGINS` to your exact frontend origin(s), comma-separated. Set the `VITE_PRODUCT_API_URL` build environment variable in the frontend hosting environment to the Render service origin, for example `https://your-service.onrender.com` (no trailing slash), then rebuild/redeploy the frontend.

## Firebase data

The existing `addItem` function stores the expanded fields under `users/{uid}/items/{itemId}`. Keep your existing Firebase Authentication and Realtime Database rules. Ensure the rules allow authenticated users to write only under their own `users/{uid}` path.

## Important limitations

Metadata reading is best-effort. Marketplace pages may return a login page, block automated requests, render details only in JavaScript, or omit seller/stock/ratings/variation details from public metadata. Those fields will be empty and must be confirmed manually or obtained through an approved official API. Do not treat an empty field as zero stock or a zero rating.
