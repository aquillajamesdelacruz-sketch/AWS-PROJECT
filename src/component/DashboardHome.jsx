import { useEffect, useRef, useState } from "react";
import "./DashboardHome.css";
import { storeBreakdown, biggestDrop, topWatched, dropPercent, totalSaved, savedPercent, savingsTrend, trendPath, timeAgo } from "../lib/Dashboardstats.js";

const peso = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });

const today = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

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

// panel now shows real notifications.
// saved in Firebase so it survives a refresh.
export function Notifications({ notifications = [], readAt = 0, enabled = true, onMarkRead, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const away = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[aria-label="Notifications"]')) onClose();
    };
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { 

      document.removeEventListener("mousedown", away); 
      document.removeEventListener("keydown", esc); };
      
  }, [onClose]);

  return (
    <div className="dh-notif" ref={ref} role="dialog" aria-label="Notifications">
      <div className="dh-notif__head">
        <h2>Notifications</h2>
        <button type="button" onClick={onMarkRead} disabled={!notifications.length}>Mark all as read</button>
      </div>
      {!enabled ? (
        <p className="dh-none dh-notif__empty">In-app alerts are turned off. You can switch them on in Settings.</p>
      ) : notifications.length === 0 ? (
        <p className="dh-none dh-notif__empty">Nothing new yet. Pixie will tell you when a price changes.</p>
      ) : (
        <ul>
          {notifications.map((n) => (
            <li key={n.id}>
              <span className="dh-notif__dot" style={{ background: n.at > readAt ? n.color : "#cbd5e1" }} />
              <div><p>{n.text}</p><small>{timeAgo(n.at)}</small></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DashboardHome({ items = [], purchases = [], collections = [], onQuickAdd, onViewItem }) {
  const [url, setUrl] = useState("");

  const stores = storeBreakdown(items);                       // "Current Stores" dots
  const drop = biggestDrop(items);                            // "Today's Biggest Drop" card
  const watched = topWatched(items, 3);                       // "Price Watchlist" card
  const saved = totalSaved(items, purchases);                 // "Total Saved" amount
  const savedPct = savedPercent(items, purchases);            // badge next to the amount
  const trend = savingsTrend(items, purchases, 7);            // last 7 days, running total
  const chart = trendPath(trend);                             // SVG path for the trend

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
            <div className="dh-stat"><span className="dh-stat__icon" /><p>Currently Tracking<br /><b>{items.length} {items.length === 1 ? "Item" : "Items"}</b></p></div>
            <div className="dh-stat"><span className="dh-stat__icon" /><p>Currently Collecting<br /><b>{collections.length} {collections.length === 1 ? "Collection" : "Collections"}</b></p></div>
          </div>
          <div className="dh-stores">
            Current Stores
            {/* one dot per store that has items; hover for the store name and item count */}
            <span>{stores.map((st) => <i key={st.store} style={{ background: st.color }} title={`${st.store}: ${st.count} ${st.count === 1 ? "item" : "items"}`} />)}</span>
            <small>{stores.length ? stores.map((st) => `${st.store} (${st.count})`).join(", ") : "None yet"}</small>
          </div>
        </div>
      </section>

      <section className="dh-mid">
        <article className="dh-drop">
          <header>
            <div><h2>Today’s Biggest Drop</h2><p>as of {today()}</p></div>
            <button type="button" aria-label="More options">•••</button>
          </header>
          {drop ? (
            <>
              <div className="dh-drop__item">
                <Thumb image={drop.item.image} alt="" className="dh-drop__img" />
                <div>
                  <h3>{drop.item.name.split(",")[0]}</h3>
                  <small>{drop.item.store || "Tracked item"}</small>
                  <s>{peso(drop.item.original)}</s>
                  <div className="dh-price"><b>{peso(drop.item.price)}</b><span className="dh-badge">↓{drop.percent}%</span></div>
                </div>
              </div>
              <button type="button" className="dh-btn dh-btn--wide" onClick={() => onViewItem?.(drop.item.id)}>View Peek</button>
            </>
          ) : (
            <p className="dh-none">No price drops yet. Pixie is watching!</p>
          )}
        </article>

        <article className="dh-saved">
          <header><h2>Total Saved</h2><span>PHP</span></header>
          <div className="dh-saved__amount"><b>{peso(saved)}</b>{savedPct > 0 && <span className="dh-badge">{savedPct}%</span>}</div>
          <svg viewBox="0 0 572 130" preserveAspectRatio="none" role="img" aria-label={`Savings over the last 7 days, now ${peso(saved)}`}>
            <defs><linearGradient id="dh-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f97316" stopOpacity=".55" /><stop offset="1" stopColor="#f97316" stopOpacity=".05" /></linearGradient></defs>
            {[10, 62, 114].map((y) => <line key={y} x1="0" x2="572" y1={y} y2={y} stroke="#fff" strokeOpacity=".8" />)}
            {/* both paths come from the real savings trend (last 7 days) */}
            <path d={chart.area} fill="url(#dh-fill)" />
            <path d={chart.line} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <p>Here’s how much you’ve saved so far!</p>
        </article>
      </section>

      <section className="dh-bottom">
        <article className="dh-card dh-list">
          <header><h2>Collections</h2><a href="#collections">View All →</a></header>
          {collections.length === 0 && <p className="dh-none">No collections yet.</p>}
          {collections.map((c) => (
            <div className="dh-coll" key={c.id || c.name}>
              <div><CollectionIcon type="box" /><b>{c.name}</b><small>Target Total Price: <strong>{peso(c.goal)}</strong></small></div>
              <div className="dh-bar" role="progressbar" aria-valuenow={Math.round(c.progress * 100)} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${c.progress * 100}%`, background: c.color }} /></div>
            </div>
          ))}
        </article>

        <article className="dh-card dh-list">
          <header><h2>Price Watchlist</h2><a href="#watchlist">View All →</a></header>
          {watched.map((w) => (
            <div className="dh-watch" key={w.id}>
              <Thumb image={w.image} alt="" />
              <div><p>{w.name.split(",")[0]}</p><div className="dh-price"><b>{peso(w.price)}</b>{dropPercent(w) > 0 && <span className="dh-badge">↓{dropPercent(w)}%</span>}</div></div>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}