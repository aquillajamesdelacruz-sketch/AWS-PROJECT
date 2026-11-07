const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

setGlobalOptions({maxInstances: 10});

// Allow only supported marketplace domains. This endpoint reads public page
// metadata only; it does not log in, bypass bot checks, or access private data.
const HOSTS = [
  /(^|\.)shopee\.[a-z.]+$/i, /(^|\.)shp\.ee$/i,
  /(^|\.)lazada\.[a-z.]+$/i, /(^|\.)lzd\.co$/i,
  /(^|\.)amazon\.[a-z.]+$/i, /(^|\.)amzn\.(to|com|asia)$/i,
  /(^|\.)tiktok\.com$/i, /(^|\.)vt\.tiktok\.com$/i, /(^|\.)vm\.tiktok\.com$/i,
];

const UA = "Mozilla/5.0 (compatible; ProductMetadataReader/1.0)";
const decode = (s = "") => String(s)
    .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

const num = (v) => {
  if (v && typeof v === "object") v = v.value ?? v.amount ?? v.price;
  const parsed = Number(String(v ?? "").replace(/,/g, "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

// Read metadata independent of the order of property/name/content attributes.
const meta = (html, key) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attr = (name) => {
      const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i"));
      return match?.[1] || "";
    };
    if ([attr("property"), attr("name"), attr("itemprop")].some((v) => v.toLowerCase() === key.toLowerCase())) {
      return decode(attr("content")).trim();
    }
  }
  return "";
};

const fromJsonLd = (html) => {
  const out = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const type = [].concat(node["@type"] || []).join(",");
    if (/Product/i.test(type)) {
      out.name = out.name || node.name;
      const img = [].concat(node.image || [])[0];
      out.image = out.image || (typeof img === "object" ? img?.url : img);
      const offers = [].concat(node.offers || []);
      for (const offer of offers) {
        const price = offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price;
        if (price != null && !out.price) out.price = num(price);
        if (offer.highPrice != null && !out.original) out.original = num(offer.highPrice);
      }
    }
    Object.values(node).forEach((v) => typeof v === "object" && visit(v));
  };
  while ((m = re.exec(html))) {
    try {
      visit(JSON.parse(m[1].trim()));
    } catch {
      // Ignore malformed structured-data blocks.
    }
  }
  return out;
};

// Some marketplaces expose product data in JSON script blocks rather than JSON-LD.
// Only use price values from structured page data; never guess a price from arbitrary text.
const fromEmbeddedJson = (html) => {
  const out = {};
  const scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const priceKeys = ["price", "currentPrice", "current_price", "salePrice", "sale_price", "lowPrice", "low_price"];
  const visit = (node, depth = 0) => {
    if (!node || typeof node !== "object" || depth > 12) return;
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, depth + 1));
      return;
    }
    const title = node.name || node.title || node.productName || node.product_name;
    const image = node.image || node.imageUrl || node.image_url || node.cover;
    if (!out.name && typeof title === "string" && title.length > 3 && title.length < 500) out.name = title;
    if (!out.image && typeof image === "string") out.image = image;
    for (const key of priceKeys) {
      if (!out.price && node[key] != null) out.price = num(node[key]);
    }
    if (!out.original) out.original = num(node.originalPrice ?? node.original_price ?? node.listPrice);
    Object.values(node).forEach((child) => {
      if (child && typeof child === "object") visit(child, depth + 1);
    });
  };

  for (const script of scripts) {
    const body = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    if (!body || body.length > 1_500_000 || !/^\s*[\[{]/.test(body)) continue;
    try {
      visit(JSON.parse(body));
    } catch {
      // Not every script is JSON. Ignore scripts that cannot be parsed safely.
    }
  }
  return out;
};

const absolute = (src, base) => {
  if (!src) return "";
  try {
    return new URL(decode(src), base).href;
  } catch {
    return "";
  }
};

const allowed = (u) => {
  try {
    const p = new URL(u);
    return /^https?:$/.test(p.protocol) && HOSTS.some((re) => re.test(p.hostname));
  } catch {
    return false;
  }
};

// Explicit CORS headers are used instead of relying only on the Functions
// framework defaults. This is important when the React app runs on localhost.
const setCorsHeaders = (req, res) => {
  // This endpoint only reads public product-page metadata and returns no
  // account-specific information, so wildcard origin access is appropriate.
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
  res.set("Vary", "Origin");
};

exports.productInfo = onRequest({cors: false, timeoutSeconds: 25, memory: "256MiB"}, async (req, res) => {
  setCorsHeaders(req, res);

  // Browsers may send a preflight request before the actual lookup.
  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "GET") return res.status(405).json({error: "Use GET for product lookup."});
  const link = String(req.query.url || "").trim();
  if (!allowed(link)) return res.status(400).json({error: "Unsupported marketplace product link."});

  try {
    // Resolve short links carefully and reject redirects outside the marketplace allowlist.
    let target = link;
    let response;
    for (let i = 0; i < 5; i++) {
      response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: {
          "user-agent": UA,
          "accept": "text/html,application/xhtml+xml",
          "accept-language": "en-PH,en;q=0.9",
        },
      });
      const next = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && next) {
        target = new URL(next, target).href;
        if (!allowed(target)) return res.status(400).json({error: "The product link redirects outside supported marketplaces."});
        continue;
      }
      break;
    }

    if (!response) return res.status(502).json({error: "The marketplace did not return a response."});
    if (!response.ok) {
      return res.status(502).json({error: `The marketplace returned HTTP ${response.status}.`});
    }

    const html = (await response.text()).slice(0, 2_000_000);
    const structured = fromJsonLd(html);
    const embedded = fromEmbeddedJson(html);

    const name = structured.name || embedded.name ||
      meta(html, "og:title") || meta(html, "twitter:title") ||
      decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();

    const image = absolute(
        structured.image || embedded.image || meta(html, "og:image") || meta(html, "twitter:image"),
        target,
    );

    // Price precedence: Product JSON-LD, embedded product JSON, then explicit price metadata.
    const metadataPrice = [
      meta(html, "product:price:amount"),
      meta(html, "og:price:amount"),
      meta(html, "price"),
    ].map(num).find((value) => value > 0) || 0;

    const price = structured.price || embedded.price || metadataPrice;
    const original = structured.original || embedded.original || 0;

    res.set("Cache-Control", "public, max-age=180");
    return res.json({
      name: decode(name),
      price,
      original,
      image,
      sourceUrl: target,
      priceFound: price > 0,
    });
  } catch (error) {
    logger.warn("productInfo failed", {message: error.message});
    return res.status(502).json({
      error: "Could not read public product details from this page. The marketplace may require an approved integration or may not expose price metadata.",
    });
  }
});
