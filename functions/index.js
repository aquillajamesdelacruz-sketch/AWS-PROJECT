const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

setGlobalOptions({maxInstances: 10});

// Only these shops may be read (stops the function being used as an open proxy).
const HOSTS = [
  /(^|\.)shopee\.[a-z.]+$/i, /(^|\.)shp\.ee$/i,
  /(^|\.)lazada\.[a-z.]+$/i, /(^|\.)lzd\.co$/i,
  /(^|\.)amazon\.[a-z.]+$/i, /(^|\.)amzn\.(to|com|asia)$/i,
  /(^|\.)tiktok\.com$/i,
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const decode = (s = "") => s
    .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

const num = (v) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

// <meta property="og:title" content="..."> in either attribute order
const meta = (html, key) => {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  const m = html.match(a) || html.match(b);
  return m ? decode(m[1]).trim() : "";
};

// Walks every JSON-LD block looking for a schema.org Product
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
      for (const o of offers) {
        const price = o.price ?? o.lowPrice ?? o.priceSpecification?.price;
        if (price && !out.price) out.price = num(price);
        if (o.highPrice && !out.original) out.original = num(o.highPrice);
      }
    }
    Object.values(node).forEach((v) => typeof v === "object" && visit(v));
  };
  while ((m = re.exec(html))) {
    try {
      visit(JSON.parse(m[1].trim()));
    } catch {
      // ignore broken blocks
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

exports.productInfo = onRequest({cors: true, timeoutSeconds: 20, memory: "256MiB"}, async (req, res) => {
  const link = String(req.query.url || "").trim();
  if (!allowed(link)) return res.status(400).json({error: "Unsupported link."});

  try {
    // follow redirects by hand so a redirect can never leave the allowed shops (short links, SSRF)
    let target = link;
    let response;
    for (let i = 0; i < 5; i++) {
      response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(12000),
        headers: {"user-agent": UA, "accept": "text/html,application/xhtml+xml", "accept-language": "en-PH,en;q=0.9"},
      });
      const next = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && next) {
        target = new URL(next, target).href;
        if (!allowed(target)) return res.status(400).json({error: "Link redirects somewhere unsupported."});
        continue;
      }
      break;
    }
    if (!response.ok) return res.status(502).json({error: `The shop answered ${response.status}.`});

    const html = (await response.text()).slice(0, 2_000_000);
    const ld = fromJsonLd(html);

    const name = ld.name || meta(html, "og:title") || meta(html, "twitter:title") ||
      decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
    const image = absolute(ld.image || meta(html, "og:image") || meta(html, "twitter:image"), target);
    const price = ld.price || num(meta(html, "product:price:amount") || meta(html, "og:price:amount"));

    res.set("Cache-Control", "public, max-age=300");
    return res.json({name: decode(name), price, original: ld.original || 0, image});
  } catch (error) {
    logger.warn("productInfo failed", error);
    return res.status(502).json({error: "Could not read that page."});
  }
});
