# Deploy the React app to Firebase Hosting (Spark plan)

Firebase Hosting can serve the built React app on Spark. The marketplace reader is a separate Node service and is not run by Firebase Hosting. This project includes `render.yaml` for deploying that Node service to Render.

## 1. Deploy the product reader to Render

1. Push this project to a GitHub repository. Do not commit `.env` or secrets.
2. In Render, create a new **Blueprint** and select the repository. Render reads `render.yaml`.
3. Set `ALLOWED_ORIGINS` to your Firebase Hosting origin, for example `https://akirafirebase.web.app` (add `,https://akirafirebase.firebaseapp.com` if you use both).
4. Deploy and copy the service URL, e.g. `https://marketplace-product-reader.onrender.com`.
5. Test `https://YOUR-SERVICE.onrender.com/api/health`; it should return `{ "ok": true, ... }`.

The free Render service may sleep when idle and take a little time to wake. External marketplaces may block automated requests; the API cannot guarantee product prices.

## 2. Configure the React production API URL

Create/update `.env.production` in the project root:

```env
VITE_PRODUCT_API_URL=https://YOUR-SERVICE.onrender.com
```

Use the actual service URL, without a trailing slash. Vite embeds this value during build, so rebuild after changing it.

## 3. Build and deploy Firebase Hosting

Install Firebase CLI if needed:

```bash
npm install -g firebase-tools
firebase login
firebase use akirafirebase
```

Then from the project root:

```bash
npm install
npm run build
firebase deploy --only hosting --project akirafirebase
```

The `firebase.json` in this project publishes `dist` and rewrites routes to `index.html` for React Router. This deploys Hosting only; it does not deploy Cloud Functions and does not require Blaze.

## 4. Local development

Keep `.env` without `VITE_PRODUCT_API_URL` and run two terminals:

```bash
npm run server
```

```bash
npm run dev
```

Vite proxies `/api` to the local server.

## Notes

- Firebase Realtime Database remains connected to the existing Firebase project. Check RTDB security rules before public launch.
- Never put private API keys or service-account credentials in `VITE_*` variables.
- The Render service is a separate backend. Firebase Hosting alone cannot execute `server/index.js`.
- Use marketplace data only where the marketplace permits automated access and reuse. A successful backend response does not guarantee that every product page exposes a price.
