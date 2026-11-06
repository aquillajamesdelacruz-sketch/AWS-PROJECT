const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const peso = (n) => "₱" + Math.round(Number(n) || 0).toLocaleString("en-PH");

export const emailAlertsConfigured = () => Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);

export async function sendPriceDropEmail({ to, item, oldPrice, newPrice }) {
  if (!emailAlertsConfigured()) throw new Error("Email alerts are not set up (missing VITE_EMAILJS_* values).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to || "")) throw new Error("No valid email address in Settings.");

  const name = String(item.name || "Your item").split(",")[0];
  const reachedTarget = Number(item.target) > 0 && Number(newPrice) <= Number(item.target);
  const percent = oldPrice > 0 ? Math.round(((oldPrice - newPrice) / oldPrice) * 100) : 0;

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      service_id: SERVICE_ID,
      template_id: TEMPLATE_ID,
      user_id: PUBLIC_KEY,
      template_params: {
        to_email: to,
        subject: reachedTarget ? `${name} hit your target price!` : `${name} dropped to ${peso(newPrice)}`,
        item_name: name,
        old_price: peso(oldPrice),
        new_price: peso(newPrice),
        percent_off: `${percent}%`,
        target_price: item.target ? peso(item.target) : "not set",
        target_reached: reachedTarget ? "Yes, this is at or below your target!" : "Not yet",
        store: item.store || "",
        item_url: item.url || "",
        image_url: item.image || "",
      },
    }),
  });

  if (!response.ok) throw new Error((await response.text().catch(() => "")) || `Email service answered ${response.status}.`);
}