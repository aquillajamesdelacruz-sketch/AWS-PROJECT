// Local marketplace metadata reader.
// Run with: npm run server
// Uses Node's built-in HTTP server. Tries a plain fetch first, then a real Chromium browser (Playwright).
import http from "node:http";

const PORT = Number(process.env.PORT || process.env.PRODUCT_SERVER_PORT || 3001);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
const HOSTS = [
  /(^|\.)shopee\.[a-z.]+$/i, /(^|\.)shp\.ee$/i,
  /(^|\.)lazada\.[a-z.]+$/i, /(^|\.)lzd\.co$/i,
  /(^|\.)amazon\.[a-z.]+$/i, /(^|\.)amzn\.(to|com|asia)$/i,
  /(^|\.)tiktok\.com$/i, /(^|\.)vt\.tiktok\.com$/i, /(^|\.)vm\.tiktok\.com$/i,
];
const UA = "Mozilla/5.0 (compatible; ProductMetadataReader/1.0)";
const decode = (s = "") => String(s)
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
const num = (v) => {
  if (v && typeof v === "object") v = v.value ?? v.amount ?? v.price;
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const parsed = Number(raw.replace(/,/g, "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const meta = (html, key) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attr = (name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] || "";
    if ([attr("property"), attr("name"), attr("itemprop")].some((v) => v.toLowerCase() === key.toLowerCase())) return decode(attr("content")).trim();
  }
  return "";
};
const fromJsonLd = (html) => {
  const out = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (String(node["@type"] || "").includes("Product")) {
      out.name ||= node.name;
      const image = [].concat(node.image || [])[0];
      out.image ||= typeof image === "object" ? image?.url : image;
      for (const offer of [].concat(node.offers || [])) {
        const value = offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price;
        if (!out.price && value != null) out.price = num(value);
      }
    }
    Object.values(node).forEach((child) => { if (child && typeof child === "object") visit(child); });
  };
  while ((match = re.exec(html))) { try { visit(JSON.parse(match[1].trim())); } catch { /* Ignore invalid JSON-LD. */ } }
  return out;
};
const fromEmbeddedJson = (html) => {
  const out = {};
  const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  const priceKeys = ["price", "currentPrice", "current_price", "salePrice", "sale_price", "lowPrice", "low_price"];
  const visit = (node, depth = 0) => {
    if (!node || typeof node !== "object" || depth > 14) return;
    if (Array.isArray(node)) return node.forEach((child) => visit(child, depth + 1));
    const title = node.name || node.title || node.productName || node.product_name;
    const image = node.image || node.imageUrl || node.image_url || node.cover;
    if (!out.name && typeof title === "string" && title.length > 3 && title.length < 500) out.name = title;
    if (!out.image && typeof image === "string") out.image = image;
    for (const key of priceKeys) if (!out.price && node[key] != null) out.price = num(node[key]);
    if (!out.original) out.original = num(node.originalPrice ?? node.original_price ?? node.listPrice);
    Object.values(node).forEach((child) => { if (child && typeof child === "object") visit(child, depth + 1); });
  };
  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    if (!body || body.length > 2_000_000 || !/^\s*[\[{]/.test(body)) continue;
    try { visit(JSON.parse(body)); } catch { /* Ignore non-JSON scripts. */ }
  }
  return out;
};
const absolute = (src, base) => { if (!src) return ""; try { return new URL(decode(src), base).href; } catch { return ""; } };
const allowed = (value) => {
  try { const parsed = new URL(value); return /^https?:$/.test(parsed.protocol) && HOSTS.some((pattern) => pattern.test(parsed.hostname)); }
  catch { return false; }
};
// ---------- shared extraction (works on HTML from plain fetch OR from the rendered Playwright page) ----------
const BLOCKED_TITLE = /^(shopee|lazada|amazon|tiktok)[^a-z0-9]*(philippines|ph|\.com)?$|access denied|robot|captcha|just a moment|verify|security check/i;
function extractAll(html, base) {
  const structured = fromJsonLd(html);
  const embedded = fromEmbeddedJson(html);
  // Most trustworthy first: JSON-LD, then meta tags, and only then the loose "search all page JSON" guess.
  const name = structured.name || meta(html, "og:title") || meta(html, "twitter:title") || embedded.name
    || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const image = absolute(structured.image || meta(html, "og:image") || meta(html, "twitter:image") || embedded.image, base);
  const metadataPrice = [meta(html, "product:price:amount"), meta(html, "og:price:amount"), meta(html, "twitter:data1"), meta(html, "price")].map(num).find((v) => v > 0) || 0;
  const price = structured.price || metadataPrice || embedded.price || 0;
  const original = structured.original || embedded.original || 0;
  return { name: decode(name).replace(/\s+/g, " ").trim(), price, original, image };
}

// ---------- 1) plain HTTP read (fast, cheap; often blocked by marketplaces) ----------
async function readWithHttp(link) {
  let target = link;
  let response;
  for (let i = 0; i < 5; i++) {
    response = await fetch(target, {
      redirect: "manual", signal: AbortSignal.timeout(8000),
      headers: { "user-agent": UA, "accept": "text/html,application/xhtml+xml", "accept-language": "en-PH,en;q=0.9" },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      target = new URL(location, target).href;
      if (!allowed(target)) throw new Error("The product link redirects outside supported marketplaces.");
      continue;
    }
    break;
  }
  if (!response) throw new Error("The marketplace did not return a response.");
  if (!response.ok) throw new Error(`The marketplace returned HTTP ${response.status}.`);
  const html = (await response.text()).slice(0, 2500000);
  const data = extractAll(html, target);
  if (BLOCKED_TITLE.test(data.name)) throw new Error("The marketplace did not expose product details to the reader.");
  return { ...data, sourceUrl: target };
}

// ---------- 2) real browser read with Playwright (runs the page's JavaScript) ----------
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MAX_PAGES = Number(process.env.PLAYWRIGHT_CONCURRENCY || 1);   // keep at 1 on small servers: Chromium is memory hungry
let browserPromise = null;
let active = 0;
const waiting = [];
const acquire = () => new Promise((resolve) => { const go = () => { active++; resolve(); }; active < MAX_PAGES ? go() : waiting.push(go); });
const release = () => { active--; waiting.shift()?.(); };

function getBrowser() {
  if (!browserPromise) {
    browserPromise = import("playwright").then(({ chromium }) => chromium.launch({
      headless: true,
      channel: process.env.PRODUCT_BROWSER_CHANNEL || undefined,   // e.g. "chrome" to use the Chrome already installed on your PC
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    }));
    browserPromise.then((b) => b.on("disconnected", () => { browserPromise = null; })).catch(() => { browserPromise = null; });
  }
  return browserPromise;
}

// Runs INSIDE the page. Last resort: find ₱ amounts on screen. The biggest non-struck one is the current price;
// a struck-through one is the original price.
function scrapeVisiblePrices() {
  const re = /^(?:₱|PHP|Php)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)(?:\s?[-–]\s?(?:₱|PHP|Php)?\s?[0-9][0-9,]*(?:\.[0-9]{1,2})?)?$/;
  let price = null, original = null;
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("header, footer, nav, script, style")) continue;
    const text = (el.textContent || "").trim();
    if (text.length > 30) continue;
    const m = text.match(re);
    if (!m) continue;
    const value = Number(m[1].replace(/,/g, ""));
    const style = getComputedStyle(el);
    const size = parseFloat(style.fontSize) || 0;
    if (!(value > 0)) continue;
    if (style.textDecorationLine.includes("line-through")) { if (!original) original = value; continue; }
    if (!price || size > price.size) price = { value, size };
  }
  return { price: price ? price.value : 0, original: original || 0 };
}

async function readWithBrowser(link) {
  await acquire();
  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent: BROWSER_UA, locale: "en-PH", timezoneId: "Asia/Manila",
      viewport: { width: 1366, height: 900 },
      extraHTTPHeaders: { "accept-language": "en-PH,en;q=0.9" },
    });
    // Product name, price and image address are in the HTML/meta; the pictures themselves are not needed.
    await context.route("**/*", (route) => ["image", "media", "font"].includes(route.request().resourceType()) ? route.abort() : route.continue());
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(link, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});   // let the price script finish
    const finalUrl = page.url();
    if (!allowed(finalUrl)) throw new Error("The product link redirects outside supported marketplaces.");

    const html = (await page.content()).slice(0, 2500000);
    const data = extractAll(html, finalUrl);
    if (!data.name) data.name = (await page.title().catch(() => "")).trim();
    if (BLOCKED_TITLE.test(data.name)) throw new Error("The marketplace showed a bot-check page instead of the product.");

    if (!data.price) {
      const seen = await page.evaluate(scrapeVisiblePrices).catch(() => null);
      if (seen?.price) { data.price = seen.price; data.original ||= seen.original; }
    }
    return { ...data, sourceUrl: finalUrl };
  } catch (error) {
    if (/Cannot find package 'playwright'|Executable doesn't exist/i.test(error.message)) {
      throw new Error("Playwright is not installed on the server (run: npm install playwright && npx playwright install chromium).");
    }
    throw error;
  } finally {
    await context?.close().catch(() => {});
    release();
  }
}

// ---------- 3) pick a strategy + small cache ----------
const MODE = (process.env.PRODUCT_READER_MODE || "auto").toLowerCase();   // auto | http | browser
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

async function readProduct(link) {
  const hit = cache.get(link);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  let result = null;
  const why = { mode: MODE };            // what each strategy did, so failures are visible instead of silent
  if (MODE !== "browser") {
    try { result = await readWithHttp(link); why.http = result.price ? "found price" : "page read, no price"; }
    catch (error) { why.http = error.message; }
  }
  if (MODE !== "http" && (!result || !result.price)) {
    try {
      const viaBrowser = await readWithBrowser(link);
      why.browser = viaBrowser.price ? "found price" : "page read, no price";
      result = { ...viaBrowser, name: viaBrowser.name || result?.name || "", image: viaBrowser.image || result?.image || "" };
    } catch (error) { why.browser = error.message; }
  }
  console.log("[productInfo]", link, JSON.stringify(why));
  if (!result) {
    const err = new Error(`Could not read the page. http: ${why.http ?? "skipped"}; browser: ${why.browser ?? "skipped"}.`);
    throw err;
  }

  const data = { ...result, priceFound: result.price > 0, debug: why };
  if (data.priceFound) {
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    cache.set(link, { at: Date.now(), data });
  }
  return data;
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (requestUrl.pathname === "/api/health") { res.writeHead(200); return res.end(JSON.stringify({ ok: true, service: "local-product-reader" })); }
  if (requestUrl.pathname !== "/api/productInfo") { res.writeHead(404); return res.end(JSON.stringify({ error: "Route not found." })); }
  if (req.method !== "GET") { res.writeHead(405); return res.end(JSON.stringify({ error: "Use GET for product lookup." })); }
  const link = String(requestUrl.searchParams.get("url") || "").trim();
  if (!allowed(link)) { res.writeHead(400); return res.end(JSON.stringify({ error: "Unsupported marketplace product link." })); }
  try { const product = await readProduct(link); res.writeHead(200); return res.end(JSON.stringify(product)); }
  catch (error) {
    console.warn("[productInfo]", error.message);
    res.writeHead(502);
    return res.end(JSON.stringify({ error: `${error.message} The marketplace may block automated readers or may not publish price metadata.` }));
  }
});
server.listen(PORT, "0.0.0.0", () => console.log(`Product reader listening on port ${PORT}`));