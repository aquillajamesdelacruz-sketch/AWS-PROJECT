import { useEffect, useRef, useState } from "react";
import "./Dashboardhome.css";

const peso = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });

// Sample data. Add an `image` URL to any item to show a real product photo.
const SAMPLE_WATCHLIST = [
  { name: "Adidas Samba OG", price: 3799, drop: 20 },
  { name: "Mechanical Keyboard", price: 3799, drop: 20 },
  { name: "Adidas Samba OG", price: 3799, drop: 20 },
];
const COLLECTIONS = [
  { name: "Desk Setup", target: 22000, progress: 0.54, icon: "box" },
  { name: "Birthday Gifts", target: 10000, progress: 0.32, icon: "gift" },
  { name: "Graduation Gifts", target: 5000, progress: 0.2, icon: "gift" },
];
const STORE_COLORS = ["#f59e0b", "#1e1b4b", "#10b981", "#94a3b8"];

function Thumb({ image, alt, className = "" }) {
  return image ? <img className={`dh-thumb ${className}`} src={image} alt={alt} />
              : <span className={`dh-thumb dh-thumb--empty ${className}`} aria-hidden="true" />;
}

function CollectionIcon({ type }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {type === "gift"
        ? <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9M12 8c-2-4-6-3-5 0M12 8c2-4 6-3 5 0"/></>
        : <rect x="4" y="4" width="16" height="16" rx="3"/>}
    </svg>
  );
}

export function Notifications({ onClose }) {
  const [items, setItems] = useState([
    { id: 1, text: "Wireless Earbuds dropped to ₱899!", time: "2 hours ago", color: "#10b981", unread: true },
    { id: 2, text: "Desk Lamp went up to ₱1,150", time: "1 day ago", color: "#ef4444", unread: true },
    { id: 3, text: "Fake sale detected on Everyday Backpack", time: "3 days ago", color: "#1e3a8a", unread: true },
  ]);
  const ref = useRef(null);

  useEffect(() => {
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[aria-label="Notifications"]')) onClose();
    };
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  return (
    <div className="dh-notif" ref={ref} role="dialog" aria-label="Notifications">
      <div className="dh-notif__head">
        <h2>Notifications</h2>
        <button type="button" onClick={() => setItems(items.map((i) => ({ ...i, unread: false })))}>Mark all as read</button>
      </div>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <span className="dh-notif__dot" style={{ background: i.unread ? i.color : "#cbd5e1" }} />
            <div><p>{i.text}</p><small>{i.time}</small></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardHome({ added = [], onQuickAdd }) {
  const [url, setUrl] = useState("");
  const latest = added[0];
  const watchlist = [...added.map((a) => ({ name: a.name.split(",")[0], price: a.price, drop: 20, image: a.image })), ...SAMPLE_WATCHLIST].slice(0, 3);
  const tracking = 9 + added.length;

  const quickAdd = (e) => {
    e.preventDefault();
    if (url.trim()) { onQuickAdd(url.trim()); setUrl(""); }
  };

  return (
    <div className="dh">
      <section className="dh-card dh-top">
        <form className="dh-track" onSubmit={quickAdd}>
          <h2>Track a New Item</h2>
          <p>Paste a product link to quick add a new item on the watchlist.</p>
          <label htmlFor="dh-url">Product link</label>
          <div className="dh-track__row">
            <input id="dh-url" type="url" placeholder="Paste a product URL" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button type="submit" className="dh-btn">+ Quick Add</button>
          </div>
        </form>

        <div className="dh-insights">
          <h2>Quick Insights</h2>
          <div className="dh-insights__row">
            <div className="dh-stat"><span className="dh-stat__icon" /><p>Currently Tracking<br /><b>{tracking} Items</b></p></div>
            <div className="dh-stat"><span className="dh-stat__icon" /><p>Currently Collecting<br /><b>5 Collections</b></p></div>
          </div>
          <div className="dh-stores">
            Current Stores
            <span>{STORE_COLORS.map((c) => <i key={c} style={{ background: c }} />)}</span>
          </div>
        </div>
      </section>

      <section className="dh-mid">
        <article className="dh-drop">
          <header>
            <div><h2>Today’s Biggest Drop</h2><p>as of October 13, 2026</p></div>
            <button type="button" aria-label="More options">•••</button>
          </header>
          <div className="dh-drop__item">
            <Thumb image={latest?.image} alt="" className="dh-drop__img" />
            <div>
              <h3>Mechanical Keyboard</h3>
              <small>Keychron K6</small>
              <s>₱3,499</s>
              <div className="dh-price"><b>₱2,799</b><span className="dh-badge">↓20%</span></div>
            </div>
          </div>
          <button type="button" className="dh-btn dh-btn--wide">View Peek</button>
        </article>

        <article className="dh-saved">
          <header><h2>Total Saved</h2><span>PHP</span></header>
          <div className="dh-saved__amount"><b>₱4,320.00</b><span className="dh-badge">+12%</span></div>
          <svg viewBox="0 0 572 130" preserveAspectRatio="none" role="img" aria-label="Savings trend chart">
            <defs><linearGradient id="dh-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f97316" stopOpacity=".55" /><stop offset="1" stopColor="#f97316" stopOpacity=".05" /></linearGradient></defs>
            {[10, 62, 114].map((y) => <line key={y} x1="0" x2="572" y1={y} y2={y} stroke="#fff" strokeOpacity=".8" />)}
            <path d="M0 110C30 100 40 82 60 90S90 118 120 100 160 92 200 82s60 6 80 -4 30-60 70-60 50 44 90 40 60-15 100-26 22-16 32-26V130H0z" fill="url(#dh-fill)" />
            <path d="M0 110C30 100 40 82 60 90S90 118 120 100 160 92 200 82s60 6 80 -4 30-60 70-60 50 44 90 40 60-15 100-26 22-16 32-26" fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p>Here’s how much you’ve saved so far!</p>
        </article>
      </section>

      <section className="dh-bottom">
        <article className="dh-card dh-list">
          <header><h2>Collections</h2><a href="#collections">View All →</a></header>
          {COLLECTIONS.map((c) => (
            <div className="dh-coll" key={c.name}>
              <div><CollectionIcon type={c.icon} /><b>{c.name}</b><small>Target Total Price: <strong>{peso(c.target)}</strong></small></div>
              <div className="dh-bar" role="progressbar" aria-valuenow={Math.round(c.progress * 100)} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${c.progress * 100}%` }} /></div>
            </div>
          ))}
        </article>

        <article className="dh-card dh-list">
          <header><h2>Price Watchlist</h2><a href="#watchlist">View All →</a></header>
          {watchlist.map((w, i) => (
            <div className="dh-watch" key={i}>
              <Thumb image={w.image} alt="" />
              <div><p>{w.name}</p><div className="dh-price"><b>{peso(w.price)}</b><span className="dh-badge">↓{w.drop}%</span></div></div>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}