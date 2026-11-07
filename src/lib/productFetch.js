import { validateProductUrl } from "./validation/schemas.js";

const TIMEOUT_MS = 20000;

const parseMoney = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "object") value = value.value ?? value.amount ?? value.price ?? "";
  const cleaned = String(value).replace(/,/g, "").replace(/[^0-9.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const cleanTitle = (title = "") => String(title)
  .replace(/\s*[|\-–—·]\s*(shopee|lazada|amazon|tiktok)[^|\-–—·]*$/i, "")
  .replace(/\s+/g, " ")
  .trim();

const priceFromText = (...values) => {
  for (const value of values) {
    if (value == null) continue;
    const match = String(value).match(/(?:₱|PHP|Php|\bP)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
    if (match) {
      const price = parseMoney(match[1]);
      if (price > 0) return price;
    }
  }
  return 0;
};

export async function fetchProductInfo(url, signal) {
  const problem = validateProductUrl(url);
  if (problem) throw new Error(problem);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abortFromParent = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abortFromParent, { once: true });

  try {
    // Local development uses Vite's /api proxy. Production uses the separately
    // hosted Node API configured with VITE_PRODUCT_API_URL.
    const apiBase = (import.meta.env.VITE_PRODUCT_API_URL || "").replace(/\/$/, "");
    const endpoint = `${apiBase}/api/productInfo?url=${encodeURIComponent(url.trim())}`;
    const response = await fetch(endpoint, { signal: controller.signal });
    const data = await response.json().catch(() => ({}));

    if (response.status === 429) {
      throw new Error("The marketplace reader is temporarily rate-limited. Please try again later.");
    }
    if (!response.ok) {
      throw new Error(data.error || data.message || `The local product reader returned ${response.status}.`);
    }

    const name = cleanTitle(data.name || data.title || "");
    const price = parseMoney(data.price ?? data.currentPrice ?? data.current_price) ||
      priceFromText(data.name, data.title, data.description);

    return {
      name,
      price,
      original: parseMoney(data.original ?? data.originalPrice ?? data.original_price),
      image: data.image || data.imageUrl || "",
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Reading the product link took too long. Check that the local product server is running, then try again.");
    }
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      throw new Error("Cannot reach the product reader. Check that the local server is running, or verify VITE_PRODUCT_API_URL in your deployed environment.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromParent);
  }
}
