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
  signal?.addEventListener("abort", () => controller.abort());

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) throw new Error(`The link reader answered ${response.status}.`);
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Reading the link took too long.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export async function fetchProductInfo(url, signal) {
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
  return {
    name: cleanTitle(page.title),
    price: findPrice(page.title, page.description),
    original: 0,                                  // a plain page preview never shows the old price
    image: page.image?.url || "",
  };
}
