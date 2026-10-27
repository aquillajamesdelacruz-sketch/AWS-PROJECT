import { useState } from "react";
import "./Dashboard.css";
import logo from "./assets/logo.png";
import mascot from "./assets/mascot.png";
import find from "./assets/find.png";
import stocks from "./assets/stocks.png";
import sleep from "./assets/sleep.png";
import Additemmodal from "./Additemmodal";
import Watchlist from "./Watchlist";
import Dashboardhome, { Notifications } from "./Dashboardhome";

const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const NAV = [
  { label: "Dashboard", icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { label: "Watchlist", icon: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></> },
  { label: "Collection", icon: <><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></> },
  { label: "Bought and Savings", icon: <><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></> },
];

const getSteps = (firstName) => [
  {
    image: mascot,
    alt: "Pixie waving",
    title: <>Hi, {firstName}! My name is <span className="db-accent">PIXIE.</span></>,
    text: "Your personal price-tracking buddy! I'll keep an eye on your favorite products so you can buy them when the price is just right.",
  },
  {
    image: find,
    alt: "Pixie searching with a magnifying glass",
    title: <>Add what you <span className="db-accent">love.</span></>,
    text: "Paste a product link and I'll add it to your watchlist. I check prices for you, so you don't have to.",
  },
  {
    image: stocks,
    alt: "Pixie holding signs showing prices going up and down",
    title: <>Set a price, then <span className="db-accent">relax.</span></>,
    text: "Pick a target price and I'll let you know the moment it drops. A little patience, a better price.",
  },
];

export default function Dashboard({ userName = "Bea Shainne" }) {
  const firstName = userName.split(" ")[0];
  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const STEPS = getSteps(firstName);
  const [active, setActive] = useState("Dashboard");
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");
  const [items, setItems] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const openAdd = (url = "") => { setQuickUrl(url); setAddOpen(true); };

  const isLast = step === STEPS.length - 1;
  const next = () => (isLast ? setOpen(false) : setStep(step + 1));

  return (
    <div className="db-app">
      {/* ---------- Sidebar ---------- */}
      <aside className="db-side">
        <img className="db-side__logo" src={logo} alt="PeekyFox" />

        <p className="db-side__group">Workspace</p>
        <nav aria-label="Workspace">
          {NAV.map((n) => (
            <button key={n.label} type="button"
              className={`db-nav${active === n.label ? " is-active" : ""}`}
              aria-current={active === n.label ? "page" : undefined}
              onClick={() => setActive(n.label)}>
              <Icon>{n.icon}</Icon>{n.label}
            </button>
          ))}
        </nav>

        <p className="db-side__group">Preferences</p>
        <button type="button" className="db-nav">
          <Icon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>
          Settings
        </button>

        <div className="db-tip">
          <img className="db-tip__fox" src={mascot} alt="" />
          <p>Pixie tip: Set a target price and I will cheer when it drops.</p>
        </div>
        <p className="db-side__foot">A little patience. A better price.</p>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="db-main">
        {active === "Watchlist" ? (
          <Watchlist
            items={items}
            onAdd={() => openAdd()}
            onUpdate={(u) => setItems((prev) => prev.map((i) => (i.id === u.id ? u : i)))}
            onDelete={(ids) => setItems((prev) => prev.filter((i) => !ids.includes(i.id)))}
          />
        ) : (
          <>
          <header className="db-top">
            <img className="db-top__fox" src={mascot} alt="Pixie" />
            <div className="db-top__text">
              <h1>Welcome back, {userName}!</h1>
              <p>What product do you want to track today?</p>
            </div>
            <div className="db-top__tools">
              <button type="button" className="db-iconbtn" aria-label="Search">
                <Icon><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>
              </button>
              <button type="button" className="db-iconbtn" aria-label="Notifications" aria-expanded={notifOpen} onClick={() => setNotifOpen(!notifOpen)}>
                <Icon><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>
              </button>
              {notifOpen && <Notifications onClose={() => setNotifOpen(false)} />}
              <span className="db-avatar" aria-label={userName}>{initials}</span>
            </div>
          </header>

          {items.length > 0 ? (
            <Dashboardhome added={items} onQuickAdd={openAdd} />
          ) : (
            <section className="db-empty" aria-labelledby="db-empty-title">
              <img className="db-empty__fox" src={sleep} alt="Pixie sleeping" />
              <h2 id="db-empty-title">It's quiet in here.</h2>
              <p>Paste your first link to start tracking prices.</p>
              <button type="button" className="db-add" onClick={() => openAdd()}>+ Add your first item</button>
            </section>
          )}
          </>
        )}
      </main>

      {addOpen && (
        <Additemmodal
          key={quickUrl || "new"}
          initialUrl={quickUrl}
          onClose={() => setAddOpen(false)}
          onSave={(item) => setItems((prev) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, image: null, alert: true, ...item }, ...prev])}
        />
      )}

      {/* ---------- Onboarding modal ---------- */}
      {open && (
        <div className="db-overlay" role="presentation">
          <div className="db-modal" role="dialog" aria-modal="true" aria-label="Meet Pixie">
            <button type="button" className="db-modal__close" aria-label="Close" onClick={() => setOpen(false)}>×</button>

            <ol className="db-steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((_, i) => (
                <li key={i} className={`db-step${i === step ? " is-current" : i < step ? " is-done" : ""}`}>{i + 1}</li>
              ))}
            </ol>

            <div className="db-modal__body">
              <div className="db-modal__stage">
                <img key={step} src={STEPS[step].image} alt={STEPS[step].alt} />
                <span className="db-modal__shadow" />
              </div>
              <div className="db-modal__copy">
                <h2>{STEPS[step].title}</h2>
                <p>{STEPS[step].text}</p>
              </div>
            </div>

            <button type="button" className="db-next" onClick={next}>{isLast ? "Get started" : "Next"}</button>
          </div>
        </div>
      )}
    </div>
  );
}