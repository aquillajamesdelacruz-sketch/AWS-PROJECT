import { validateProductUrl } from "./validation/schemas.js";

const CUSTOM_API = import.meta.env.VITE_PRODUCT_API_URL;
const TIMEOUT_MS = 15000;

const parseMoney = (v) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

// Titles often end with the shop name: "Samba OG | Shopee Philippines", "Keyboard - Lazada.com.ph"
const cleanTitle = (title = "") =>
  title
    .replace(/\s*[|\-–—·]\s*(shopee|lazada|amazon|tiktok)[^|\-–—·]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

// Finds "₱1,299", "PHP 1299.00" or "P1,299" in a text. Returns 0 when there is none.
const findPrice = (...texts) => {
  for (const text of texts) {
    const match = String(text || "").match(/(?:₱|PHP|Php|\bP)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
    if (match) return parseMoney(match[1]);
  }
  return 0;
};

// fetch() with a time limit, so the form never spins forever
const getJson = async (endpoint, signal) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (response.status === 429) {
      throw new Error("The free link reader is out of requests for today. Please type the details yourself, or try again later.");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || body.message || `The link reader answered ${response.status}.`);
    }
    return await response.json().catch(() => {
      throw new Error("The link reader sent something unreadable.");
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Reading the link took too long.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

// Same link asked twice (React dev mode runs effects twice, or the user clicks Fetch again)
// shares one request and reuses the answer, so the free daily limit is not wasted.
const cache = new Map();

export function fetchProductInfo(url, signal) {
  const key = String(url || "").trim();
  if (cache.has(key)) return cache.get(key);

  const promise = readProduct(url, signal).catch((error) => {
    cache.delete(key);               // failures are not remembered, so retrying works
    throw error;
  });
  cache.set(key, promise);
  return promise;
}

async function readProduct(url, signal) {
  // never fetch an invalid / unsupported link
  const problem = validateProductUrl(url);
  if (problem) throw new Error(problem);

  const link = url.trim();

  if (CUSTOM_API) {
    const data = await getJson(`${CUSTOM_API}${CUSTOM_API.includes("?") ? "&" : "?"}url=${encodeURIComponent(link)}`, signal);
    return {
      name: cleanTitle(data.name || data.title),
      price: parseMoney(data.price),
      original: parseMoney(data.original),
      image: data.image || "",
    };
  }

  const data = await getJson(`https://api.microlink.io/?url=${encodeURIComponent(link)}`, signal);
  if (data.status !== "success" || !data.data) {
    throw new Error(data.message || "Could not read that page.");
  }

  const page = data.data;
  // shops that block the reader return a generic page ("Shopee Philippines", "Access denied")
  const title = cleanTitle(page.title);
  const generic = /^(shopee|lazada|amazon|tiktok)[^a-z0-9]*(philippines|ph|\.com)?$|access denied|robot|captcha|just a moment/i.test(title);
  if (generic) {
    throw new Error("The shop blocked the reader. Deploy the productInfo function (see README) or fill in the details yourself.");
  }
  return {
    name: title,
    price: findPrice(page.title, page.description),
    original: 0,                                  // a plain page preview never shows the old price
    image: page.image?.url || "",
  };
}