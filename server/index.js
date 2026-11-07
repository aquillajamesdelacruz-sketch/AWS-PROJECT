// Local marketplace metadata reader.
// Run with: npm run server
// Uses Node's built-in HTTP server and fetch; no Firebase Blaze plan is needed.
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
async function readProduct(link) {
  let target = link;
  let response;
  for (let i = 0; i < 5; i++) {
    response = await fetch(target, {
      redirect: "manual", signal: AbortSignal.timeout(15000),
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
  const structured = fromJsonLd(html);
  const embedded = fromEmbeddedJson(html);
  const name = structured.name || embedded.name || meta(html, "og:title") || meta(html, "twitter:title") || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const image = absolute(structured.image || embedded.image || meta(html, "og:image") || meta(html, "twitter:image"), target);
  const metadataPrice = [meta(html, "product:price:amount"), meta(html, "og:price:amount"), meta(html, "twitter:data1"), meta(html, "price")].map(num).find((value) => value > 0) || 0;
  const price = structured.price || embedded.price || metadataPrice;
  const original = structured.original || embedded.original || 0;
  const cleanName = decode(name).replace(/\s+/g, " ").trim();
  if (/^(shopee|lazada|amazon|tiktok)[^a-z0-9]*(philippines|ph|\.com)?$|access denied|robot|captcha|just a moment/i.test(cleanName)) throw new Error("The marketplace did not expose product details to the reader.");
  return { name: cleanName, price, original, image, sourceUrl: target, priceFound: price > 0 };
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
