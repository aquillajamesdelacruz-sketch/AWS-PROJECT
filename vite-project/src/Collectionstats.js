export const COLORS = [
  { value: "#f97316", name: "Orange" },
  { value: "#1e3a8a", name: "Navy" },
  { value: "#10b981", name: "Green" },
  { value: "#94a3b8", name: "Gray" },
  { value: "#0f172a", name: "Black" },
];

const sum = (list, pick) => list.reduce((t, i) => t + (Number(pick(i)) || 0), 0);

// Totals for the items inside one collection.
export function statsFor(items) {
  const start = sum(items, (i) => i.original ?? i.price);
  const current = sum(items, (i) => i.price);
  const goal = sum(items, (i) => i.target);
  const span = start - goal;
  const progress = span > 0
    ? Math.min(1, Math.max(0, (start - current) / span))
    : items.length && current <= goal ? 1 : 0;
  return { count: items.length, start, current, goal, progress, percent: Math.round(progress * 100) };
}