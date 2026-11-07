# Product fetch: local backend setup (no Firebase Blaze deployment)

The previous browser request went directly to a Firebase Cloud Function and was blocked by CORS. The project now uses a local Node.js HTTP server and a Vite development proxy instead.

## Start both processes

Terminal 1 (project root):

```bash
npm run server
```

Terminal 2 (project root):

```bash
npm run dev
```

Vite forwards `/api/productInfo` to `http://127.0.0.1:3001`. The browser makes a same-origin request to Vite, so the old deployed Cloud Function URL is no longer used. Firebase Blaze is not required for this local workflow.

## Verify the local reader

Open `http://127.0.0.1:3001/api/health` in a browser. It should return:

```json
{"ok":true,"service":"local-product-reader"}
```

Then test a marketplace product URL from the Add Item form.

## Important limitation

This change fixes the CORS/deployment dependency only. Marketplace pages may still block automated readers or omit price metadata. The app will populate a price only when a valid price is exposed in public structured metadata or embedded product JSON. It does not bypass marketplace login, bot protection, or API permissions.
