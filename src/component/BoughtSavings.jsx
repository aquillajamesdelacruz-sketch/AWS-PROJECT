import { useState } from "react";
import "./Watchlist.css";
import "./BoughtSavings.css";

import { lastMonths, monthKey } from "../lib/Dashboardstats.js";

const peso = (n) => "₱" + Math.round(n).toLocaleString("en-PH");
const sum = (list, key) => list.reduce((t, i) => t + i[key], 0);

const Icon = ({ type }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "headphones" ? <><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="2" /><rect x="17" y="14" width="4" height="6" rx="2" /></>
      : type === "mat" ? <><rect x="3" y="4" width="18" height="6" rx="2.5" /><rect x="3" y="14" width="18" height="6" rx="2.5" /></>
      : <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>}
  </svg>
);

// changed: `purchases` now comes from Firebase (users/{uid}/purchases) instead of sample data.
export default function BoughtSavings({ purchases = [], tools }) {
  const [showAll, setShowAll] = useState(false);

  const totalSaved = sum(purchases, "saved");
  const totalSpent = sum(purchases, "paid");
  const avgDiscount = totalSaved + totalSpent ? Math.round((totalSaved / (totalSaved + totalSpent)) * 100) : 0;
  // last 6 real calendar months; each purchase is placed in the month it was bought (boughtAt)
  const monthly = lastMonths(6).map(({ key, label }) => ({ m: label, v: sum(purchases.filter((p) => monthKey(p.boughtAt) === key), "saved") }));
  const thisMonth = monthly[monthly.length - 1].v;
  const max = Math.max(...monthly.map((x) => x.v), 1);
  const rows = showAll ? purchases : purchases.slice(0, 2);

  return (
    <div className="wl bs">
      <header className="bs-top"><h1>Bought and savings</h1>{tools}</header>

      <section className="bs-stats" aria-label="Summary">
        <div className="bs-stat"><small>Total saved</small><b className="is-green">{peso(totalSaved)}</b></div>
        <div className="bs-stat"><small>Total spent</small><b>{peso(totalSpent)}</b></div>
        <div className="bs-stat"><small>Items bought</small><b>{purchases.length}</b></div>
        <div className="bs-stat"><small>Avg discount</small><b>{avgDiscount}%</b></div>
      </section>

      <section className="bs-banner">
        {thisMonth > 0
          ? <h2>You saved <span>{peso(thisMonth)}</span> this month! Pixie is very proud.</h2>
          : <h2>Nothing bought this month yet. Pixie is waiting for the right price!</h2>}
        <p>A little patience. A very happy fox.</p>
      </section>

      <section className="bs-card">
        <header><h2>Monthly savings</h2><span>PHP</span></header>
        <div className="bs-chart" role="img" aria-label={`Monthly savings: ${monthly.map((x) => `${x.m} ${peso(x.v)}`).join(", ")}`}>
          {monthly.map((x, i) => {
            const last = i === monthly.length - 1;
            return (
              <div className="bs-col" key={x.m}>
                {last && <b className="bs-val">{peso(x.v)}</b>}
                <i style={{ height: `${Math.max(8, (x.v / max) * 143)}px` }} />
                <span className={last ? "is-now" : ""}>{x.m}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bs-card bs-table">
        <h2>Purchases</h2>
        {purchases.length === 0 && <p>No purchases yet. Open an item in your Watchlist and tap “Mark as bought”.</p>}
        <div className="bs-row bs-row--head"><span>ITEM</span><span>STORE</span><span>PAID</span><span>SAVED</span></div>
        {rows.map((p) => (
          <div className="bs-row" key={p.id}>
            <span className="bs-item"><Icon /><b>{p.name}</b></span>
            <span className="bs-store">{p.store}</span>
            <span>Paid {peso(p.paid)}</span>
            <span className="bs-saved">Saved {peso(p.saved)}</span>
          </div>
        ))}
        {purchases.length > 2 && (
          <button type="button" className="bs-more" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show all ${purchases.length} purchases`}</button>
        )}
      </section>
    </div>
  );
}