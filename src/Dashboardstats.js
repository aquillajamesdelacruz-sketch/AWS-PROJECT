// Dashboardstats.js  (NEW)
// Pure helper functions that turn the Firebase data (items + purchases) into the
// numbers and chart points shown on the Dashboard and the "Bought and Savings" page.
// Nothing here talks to Firebase: the pages pass in the arrays they get from the
// realtime listeners, so every chart/stat recalculates automatically when the data changes.

const DAY = 24 * 60 * 60 * 1000;
const num = (v) => Number(v) || 0;

// Store -> color used in the "Current Stores" dots (unknown stores fall back to gray)
export const STORE_COLOR_MAP = {
  Shopee: "#f97316",
  Lazada: "#1e1b4b",
  Amazon: "#f59e0b",
  "TikTok Shop": "#10b981",
};
const FALLBACK_STORE_COLOR = "#94a3b8";

// Percentage the current price is below the original price (0 when it has not dropped)
export const dropPercent = (item) =>
  num(item.original) > 0 && num(item.price) < num(item.original)
    ? Math.round(((num(item.original) - num(item.price)) / num(item.original)) * 100)
    : 0;

// Items grouped by store: [{ store, count, color }], biggest first
export function storeBreakdown(items) {
  const counts = {};
  items.forEach((i) => {
    const s = i.store || "Other";
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([store, count]) => ({ store, count, color: STORE_COLOR_MAP[store] || FALLBACK_STORE_COLOR }))
    .sort((a, b) => b.count - a.count);
}

// The tracked item with the largest % drop (null when nothing has dropped yet)
export function biggestDrop(items) {
  const best = [...items].sort((a, b) => dropPercent(b) - dropPercent(a))[0];
  return best && dropPercent(best) > 0 ? { item: best, percent: dropPercent(best) } : null;
}

// The items with the biggest drops first (used by the "Price Watchlist" card)
export const topWatched = (items, n = 3) =>
  [...items].sort((a, b) => dropPercent(b) - dropPercent(a) || num(b.createdAt) - num(a.createdAt)).slice(0, n);

// Every "money saved" change as { at, amount }.
// - A tracked item contributes (previous price - new price) for each entry in item.history.
//   Items saved before history existed fall back to one event: original - price.
// - A purchase contributes its `saved` amount at the time it was bought.
function savingEvents(items, purchases) {
  const events = [];

  items.forEach((item) => {
    const h = Array.isArray(item.history) ? item.history : [];
    if (h.length >= 2) {
      for (let i = 1; i < h.length; i++) {
        events.push({ at: num(h[i].at), amount: num(h[i - 1].price) - num(h[i].price) });
      }
    } else {
      events.push({ at: num(item.createdAt), amount: num(item.original) - num(item.price) });
    }
  });

  purchases.forEach((p) => events.push({ at: num(p.boughtAt), amount: num(p.saved) }));
  return events;
}

// Total saved = purchases + the drops on items you are still tracking
export function totalSaved(items, purchases) {
  const total = savingEvents(items, purchases).reduce((t, e) => t + e.amount, 0);
  return Math.max(0, total);
}

// Saved as a % of everything you have tracked or bought (for the little badge)
export function savedPercent(items, purchases) {
  const base =
    items.reduce((t, i) => t + num(i.original), 0) + purchases.reduce((t, p) => t + num(p.paid) + num(p.saved), 0);
  return base > 0 ? Math.round((totalSaved(items, purchases) / base) * 100) : 0;
}

// Running total of savings over the last `days` days -> array of numbers (one per day).
// Savings from before the window are included in the starting value.
export function savingsTrend(items, purchases, days = 7, now = Date.now()) {
  const events = savingEvents(items, purchases);
  const start = now - (days - 1) * DAY;
  const points = [];
  for (let d = 0; d < days; d++) {
    const end = start + (d + 1) * DAY - 1;
    points.push(Math.max(0, events.filter((e) => e.at <= end).reduce((t, e) => t + e.amount, 0)));
  }
  return points;
}

// Turns trend numbers into SVG coordinates for a viewBox of `w` x `h`
export function trendPath(values, w = 572, h = 130, pad = 14) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - pad - (v / max) * (h - pad * 2)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { line, area: `${line} L${w} ${h} L0 ${h}Z` };
}

// The last `count` months as [{ key: "2026-10", label: "Oct" }], oldest first
export function lastMonths(count = 6, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
    };
  });
}

// Month key ("2026-10") of a purchase
export const monthKey = (ms) => {
  const d = new Date(num(ms));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// "just now", "5 minutes ago", "3 days ago" ...
export function timeAgo(ms, now = Date.now()) {
  const s = Math.max(0, Math.round((now - num(ms)) / 1000));
  if (s < 60) return "just now";
  const units = [["minute", 60], ["hour", 3600], ["day", 86400], ["month", 2592000]];
  let label = "minute", value = 1;
  for (const [name, size] of units) {
    if (s >= size) { label = name; value = Math.floor(s / size); }
  }
  return `${value} ${label}${value > 1 ? "s" : ""} ago`;
}
