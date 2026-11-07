# AWS Project — local marketplace product importer

## Run the application locally

This project uses Firebase Realtime Database for saved products. Product-page lookup is handled by a small local Node.js server, so **you do not need Firebase Cloud Functions or the Firebase Blaze plan** for local development.

You need Node.js 20 or newer (Node 24 is also supported).

1. Install frontend dependencies once:

   ```bash
   npm install
   ```

2. Open a terminal in the project root and start the product reader:

   ```bash
   npm run server
   ```

   It should print `Local product reader running at http://127.0.0.1:3001`.

3. Open a second terminal in the project root and start React/Vite:

   ```bash
   npm run dev
   ```

4. Open the localhost URL printed by Vite. Keep both terminals running while testing product imports.

Vite proxies `/api/productInfo` to the local server. The browser therefore calls the same origin (`localhost:5173`) and does not call the old Firebase Cloud Function URL. The server uses Node's built-in `http` and `fetch`; it does not need Express or additional packages.

## Marketplace support and price limitations

The importer accepts supported Shopee, Lazada, Amazon, and TikTok URLs. It follows marketplace short-link redirects only when the redirect remains within the supported marketplace domains. It reads public page metadata, JSON-LD, and embedded JSON when the marketplace makes those fields available.

A local server fixes the previous Firebase deployment and browser CORS dependency. It **cannot guarantee** that every marketplace page will reveal a product price. Some pages require scripts, cookies, login, region-specific access, or approved partner APIs; others block automated readers. In those cases the form remains editable and the price must be entered manually. The reader does not bypass logins, anti-bot checks, or marketplace restrictions.

## Firebase

Firebase Realtime Database remains the storage layer. Keep your existing Firebase configuration and database security rules. Only the product-fetching endpoint has moved from Cloud Functions to the local Node server.

## Troubleshooting

- `Cannot reach the local product reader`: make sure `npm run server` is running in the first terminal.
- Port 3001 is already in use: close the other process or start with `PRODUCT_SERVER_PORT=3002 npm run server`, then update the Vite proxy target in `vite.config.js` to port 3002.
- Product details are not found: the marketplace may have blocked the server request or not exposed product metadata. This is different from CORS. Try another public listing or enter the details manually.
- If you change `.env`, restart `npm run dev`.

## Useful commands

```bash
npm run dev
npm run server
npm run build
npm run lint
```


## Forgot password

The login page uses Firebase Authentication's `sendPasswordResetEmail` function. In the Firebase Console, open **Authentication → Sign-in method** and ensure **Email/Password** is enabled. Under **Authentication → Settings → Authorized domains**, make sure your local development domain (`localhost`) and your Firebase Hosting domain (`PROJECT_ID.web.app` and, if used, `PROJECT_ID.firebaseapp.com`) are listed. Users enter their email in the login form and select **Forgot password?**; Firebase sends the reset email using its configured email template. Check the spam folder if it does not appear. No Cloud Functions or Blaze upgrade is required for this feature.
