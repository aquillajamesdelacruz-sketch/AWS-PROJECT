import { useEffect, useState } from "react";
import "./Additemmodal.css";
import find from "./assets/find.png";
import mascot from "./assets/mascot.png";

const STEPS = ["Paste link", "Confirm details", "Track"];
const STORES = { shopee: "Shopee", lazada: "Lazada", amazon: "Amazon", tiktok: "TikTok Shop" };

const detectStore = (url) => {
  const key = Object.keys(STORES).find((k) => url.toLowerCase().includes(k));
  return key ? STORES[key] : null;
};
const parse = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const peso = (n) => "₱" + parse(n).toLocaleString("en-PH");

function StepLine() {
  return (
    <svg className="ai-line" width="106" height="24" viewBox="0 0 106 24" fill="none" aria-hidden="true">
      <path d="M1 12h8l5-7 7 14 7-14 7 14 6-7h14" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M70 12c8-9 22-9 28 0-6 9-20 9-28 0z" fill="#f97316" />
      <path d="M99 7l5-3M99 17l5 3M100 12h5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AddItemModal({ initialUrl = "", collections = [], onClose, onSave }) {
  const [phase, setPhase] = useState(initialUrl ? "fetching" : "paste"); // paste | fetching | confirm | success
  const [url, setUrl] = useState(initialUrl);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [original, setOriginal] = useState(0);
  const [target, setTarget] = useState("");
  const [collection, setCollection] = useState(collections[0] || "");
  const [toast, setToast] = useState(false);

  const step = phase === "success" ? 2 : phase === "confirm" ? 1 : 0;
  const store = detectStore(url);

  // Simulated fetch. TODO: replace the timeout with a real request to your scraper/API.
  useEffect(() => {
    if (phase !== "fetching") return;
    const t = setTimeout(() => {
      setName("Mechanical Keyboard, hot-swap");
      setPrice("2799");
      setOriginal(3499);
      setTarget("2500");
      setPhase("confirm");
    }, 1700);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    onSave?.({ image: keyboard /* demo photo: use the image from your real fetch */, name, url, store, original: Math.max(original, parse(price)), price: parse(price), target: parse(target), collection });
    setToast(true);
    setPhase("success");
  };

  const reset = () => {
    setUrl(""); setName(""); setPrice(""); setTarget("");
    setToast(false); setPhase("paste");
  };

  return (
    <div className="ai-overlay" role="presentation">
      <div className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-title">
        <header className="ai-head">
          <div>
            <h2 id="ai-title">Add an item</h2>
            <p>One link closer to a better price.</p>
          </div>
          <button type="button" className="ai-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <ol className="ai-steps" aria-label={`Step ${step + 1} of 3`}>
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? "is-current" : ""}>
              <span>{i + 1} {label}</span>
              {i < STEPS.length - 1 && <StepLine />}
            </li>
          ))}
        </ol>

        {phase !== "success" && (
          <>
            <label className="ai-label" htmlFor="ai-url">Product link</label>
            <div className="ai-linkrow">
              <input id="ai-url" className="ai-input" type="url" placeholder="https://shopee.ph/product/example"
                value={url} onChange={(e) => setUrl(e.target.value)} disabled={phase === "fetching"} />
              <button type="button" className={`ai-fetch${phase === "fetching" ? " is-busy" : ""}`}
                disabled={!url.trim() || phase === "fetching"} onClick={() => setPhase("fetching")}>
                {phase === "fetching" && <span className="ai-dot" />}Fetch
              </button>
            </div>
          </>
        )}

        {phase === "paste" && (
          <div className="ai-center">
            <img src={find} alt="" className="ai-fox" />
            <h3>Paste a link to get started.</h3>
            <p>Shopee, Lazada, Amazon and more.</p>
          </div>
        )}

        {phase === "fetching" && (
          <>
            <div className="ai-center">
              <img src={find} alt="Pixie searching with a magnifying glass" className="ai-fox" />
              <h3>Pixie is taking a closer look.</h3>
              <p>Fetching the image, title and current price...</p>
              <span className="ai-spinner" role="status" aria-label="Loading" />
            </div>
            <div className="ai-skeleton" aria-hidden="true">
              <i className="ai-skeleton__img" />
              <div><i style={{ width: "62%" }} /><i style={{ width: "38%" }} /><i style={{ width: "20%", height: 26 }} /></div>
            </div>
          </>
        )}

        {phase === "confirm" && (
          <>
            {store && <span className="ai-badge">{store} detected</span>}
            <label className="ai-label" htmlFor="ai-name">Product name</label>
            <input id="ai-name" className="ai-input" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="ai-grid">
              <div>
                <label className="ai-label" htmlFor="ai-price">Current price</label>
                <input id="ai-price" className="ai-input" inputMode="decimal" value={price ? peso(price) : ""}
                  onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-target">Target price</label>
                <input id="ai-target" className="ai-input" inputMode="decimal" value={target ? peso(target) : ""}
                  onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-coll">Collection</label>
                <select id="ai-coll" className="ai-input ai-select" value={collection} onChange={(e) => setCollection(e.target.value)}>
                  <option value="">No collection</option>
                  {collections.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="ai-actions ai-actions--end">
              <button type="button" className="ai-btn ai-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="ai-btn ai-btn--primary" onClick={save} disabled={!name.trim()}>Save and track</button>
            </div>
          </>
        )}

        {phase === "success" && (
          <>
            <div className="ai-success">
              <div className="ai-success__stage">
                {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} className={`ai-confetti ai-confetti--${i}`} />)}
                <img src={mascot} alt="Pixie celebrating" />
              </div>
              <h3>Item tracked successfully!</h3>
              <p className="ai-success__msg">
                {name.split(",")[0]} added to {collection || "your watchlist"}. We will notify you when it hits {peso(target)}.
              </p>
              <div className="ai-actions">
                <button type="button" className="ai-btn ai-btn--primary" onClick={onClose}>Go to Dashboard</button>
                <button type="button" className="ai-btn ai-btn--ghost" onClick={reset}>Add another item</button>
              </div>
            </div>
            {toast && (
              <div className="ai-toast" role="status">
                <span className="ai-toast__dot" />Item added to tracker.
                <button type="button" aria-label="Dismiss" onClick={() => setToast(false)}>×</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}