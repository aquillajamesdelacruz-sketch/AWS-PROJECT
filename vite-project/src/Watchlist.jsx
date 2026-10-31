import { useEffect, useMemo, useState } from "react";
import "./Watchlist.css";
import mascot from "./assets/mascot.png";
import find from "./assets/find.png";
import sleep from "./assets/sleep.png";

/* ---------- helpers ---------- */
const parse = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const peso = (n) => "₱" + Math.round(n).toLocaleString("en-PH");
const peso2 = (n) => "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = (n) => "₱" + (n >= 1000 ? (n / 1000).toFixed(2) + "K" : Math.round(n));
const toTarget = (it) => Math.max(0, it.price - it.target);
const change = (it) => (it.original ? Math.round(((it.price - it.original) / it.original) * 100) : 0);
const progress = (it) => {
  const span = it.original - it.target;
  if (span <= 0) return it.price <= it.target ? 1 : 0;
  return Math.min(1, Math.max(0, (it.original - it.price) / span));
};
// Demo history that walks from the original price to the current one. Replace with real data.
const historyOf = (it) =>
  Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const wobble = Math.sin(i * 1.4) * 0.05 * it.original * (1 - t);
    return i === 11 ? it.price : it.original + (it.price - it.original) * t + wobble;
  });

function useEscape(fn) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && fn();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fn]);
}

/* ---------- icons ---------- */
const I = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const SearchI = () => <I><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></I>;
const PlusI = () => <I><path d="M12 5v14M5 12h14" /></I>;
const PencilI = () => <I><path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" /></I>;
const GridI = () => <I><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>;
const ListI = () => <I><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></I>;
const TrashI = () => <I><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></I>;
const SortI = () => <I size={18}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></I>;

function Thumb({ item, className = "" }) {
  return item.image
    ? <img className={`wl-img ${className}`} src={item.image} alt={item.name} />
    : <span className={`wl-img wl-img--empty ${className}`} role="img" aria-label="No product photo"><I size={32}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></I></span>;
}

export function Modal({ onClose, children, className = "" }) {
  useEscape(onClose);
  return (
    <div className="wl-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`wl-modal ${className}`} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

function ProgressBar({ item }) {
  return (
    <div className="wl-prog" role="progressbar" aria-valuenow={Math.round(progress(item) * 100)} aria-valuemin="0" aria-valuemax="100">
      <i style={{ width: `${progress(item) * 100}%` }} />
      <b />
    </div>
  );
}

/* ---------- confirm delete ---------- */
function ConfirmDelete({ onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel} className="wl-modal--sm">
      <h2>Are you sure you want to delete?</h2>
      <p className="wl-muted">You’ll have to add them again.</p>
      <div className="wl-actions">
        <button type="button" className="wl-btn wl-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="wl-btn wl-btn--danger" onClick={onConfirm}>Delete</button>
      </div>
    </Modal>
  );
}

/* ---------- update item ---------- */
function UpdateItem({ item, collections, onClose, onSave }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [target, setTarget] = useState(String(item.target));
  const [collection, setCollection] = useState(item.collection || "");
  return (
    <Modal onClose={onClose} className="wl-modal--md">
      <header className="wl-modal__head">
        <div><h2>Update an item</h2><p className="wl-muted">Update your product’s detail anytime.</p></div>
        <button type="button" className="wl-x" aria-label="Close" onClick={onClose}>×</button>
      </header>
      <label className="wl-label" htmlFor="u-name">Product name</label>
      <input id="u-name" className="wl-input" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="wl-fields">
        <div><label className="wl-label" htmlFor="u-price">Current price</label>
          <input id="u-price" className="wl-input" inputMode="decimal" value={price ? peso(parse(price)) : ""} onChange={(e) => setPrice(e.target.value)} /></div>
        <div><label className="wl-label" htmlFor="u-target">Target price</label>
          <input id="u-target" className="wl-input" inputMode="decimal" value={target ? peso(parse(target)) : ""} onChange={(e) => setTarget(e.target.value)} /></div>
        <div><label className="wl-label" htmlFor="u-coll">Collection</label>
          <select id="u-coll" className="wl-input wl-select" value={collection} onChange={(e) => setCollection(e.target.value)}>
            <option value="">No collection</option>{collections.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="wl-actions wl-actions--end wl-rule">
        <button type="button" className="wl-btn wl-btn--ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="wl-btn wl-btn--primary" disabled={!name.trim()}
          onClick={() => onSave({ ...item, name: name.trim(), price: parse(price), target: parse(target), collection })}>Save Update</button>
      </div>
    </Modal>
  );
}

/* ---------- product details / price history ---------- */
function ProductModal({ item, onClose, onEdit, onDelete, onUpdate }) {
  const [tab, setTab] = useState("details");
  const hist = useMemo(() => historyOf(item), [item]);
  const lo = Math.min(...hist), hi = Math.max(...hist);
  const last = hist[11] - hist[10];
  const saved = item.original - item.price;

  const W = 720, H = 140, min = lo - (hi - lo) * 0.15, max = hi + (hi - lo) * 0.1 || hi + 1;
  const pts = hist.map((v, i) => [(i / 11) * W, H - ((v - min) / (max - min)) * H]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

  return (
    <Modal onClose={onClose} className="wl-modal--lg">
      <img className="wl-peek" src={find} alt="" />
      <button type="button" className="wl-x wl-x--abs" aria-label="Close" onClick={onClose}>×</button>

      <div className="wl-tabs" role="tablist">
        {[["details", "Product Details"], ["history", "Price History"]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="wl-detail">
          <Thumb item={item} className="wl-detail__img" />
          <div className="wl-detail__info">
            <h2>{item.name.split(",")[0]}</h2>
            {item.url && <a className="wl-shop" href={item.url} target="_blank" rel="noreferrer"><b>S</b>View Product on {item.store || "store"}</a>}
            <s>{peso(item.original)}</s>
            <div className="wl-pricerow">
              <strong>{peso(item.price)}</strong>
              {saved > 0 && <span className="wl-pill wl-pill--green">Down by {peso(saved)}</span>}
            </div>
            <div className="wl-metaRow">
              <span className="wl-chip">Last update: <b>just now</b></span>
              <span className="wl-orange">{item.price <= item.target ? "Target reached!" : `${peso(toTarget(item))} to target!`}</span>
            </div>
            <ProgressBar item={item} />
            <div className="wl-ends"><span>Original: {peso(item.original)}</span><span>Target: {peso(item.target)}</span></div>
            <div className="wl-alert">
              <div><b>Tracking Alert</b><p>Notify me when the price is at or below {peso(item.target)}.</p></div>
              <button type="button" role="switch" aria-checked={item.alert} className={`wl-switch${item.alert ? " is-on" : ""}`}
                onClick={() => onUpdate({ ...item, alert: !item.alert })}><i /></button>
              <span>{item.alert ? "On" : "Off"}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="wl-hist">
          <div className="wl-chart">
            <span>PHP</span>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Price history chart">
              {[H * 0.1, H * 0.45, H - 1].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#fff" strokeOpacity=".85" />)}
              <path d={`${line} L${W} ${H} L0 ${H}Z`} fill="#fff" fillOpacity=".4" />
            </svg>
          </div>
          <div className="wl-stats">
            {[["Total Change", "since last added", saved], ["Last Change", "3 days ago", Math.abs(last)], ["Lowest Price", "since last added", lo], ["Highest Price", "3 days ago", hi]].map(([t, s, v]) => (
              <div key={t}><b>{t}</b><small>{s}</small><strong className={t === "Last Change" && last > 0 ? "is-red" : ""}>{compact(v)}</strong></div>
            ))}
          </div>
        </div>
      )}

      <div className={`wl-detail__foot${tab === "history" ? " has-tip" : ""}`}>
        {tab === "history" && (
          <div className="wl-tip">
            <img src={mascot} alt="Pixie" />
            <div><b>Pixie’s Tip:</b><p>{saved > 0 ? "The price is dropping for 3 consecutive days! It is possible that it will go lower. However, be alert!" : "The price hasn’t dropped yet. I’ll keep watching it for you."}</p></div>
          </div>
        )}
        <div className="wl-actions wl-actions--end">
          <button type="button" className="wl-btn wl-btn--outline-red" onClick={onDelete}>Delete Item</button>
          <button type="button" className="wl-btn wl-btn--primary" onClick={onEdit}>Edit Item</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- views ---------- */
export function CardView({ items, edit, selected, toggle, open, actionLabel = "View Product" }) {
  return (
    <div className="wl-cards">
      {items.map((it) => (
        <article key={it.id} className={`wl-card${selected.includes(it.id) ? " is-selected" : ""}`}
          onClick={edit ? () => toggle(it.id) : undefined}>
          <Thumb item={it} className="wl-card__img" />
          <div className="wl-card__body">
            <h3>{it.name.split(",")[0]}</h3>
            <small>Fetched from <b>{it.store || "web"}</b></small>
            <strong>{peso(it.price)}</strong>
            <div className="wl-card__saved"><s>{peso(it.original)}</s>{it.original > it.price && <span>Saved {peso(it.original - it.price)}</span>}</div>
            <div className="wl-card__target"><span>Target: {peso(it.target)}</span><b>{it.price <= it.target ? "Target reached" : `${peso(toTarget(it))} to target`}</b></div>
            <ProgressBar item={it} />
            <div className="wl-card__tip">
              <img src={mascot} alt="" />
              <p>{it.price <= it.target ? "Target hit! Time to buy." : `Almost there! Only ${peso(toTarget(it))} to go.`}</p>
            </div>
            <button type="button" className="wl-btn wl-btn--primary wl-btn--full" onClick={(e) => { e.stopPropagation(); if (!edit) open(it.id); }}>{actionLabel}</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ListView({ items, edit, selected, toggle, open, sort, setSort }) {
  const head = (key, label) => (
    <button type="button" className="wl-sort" onClick={() => setSort(sort.key === key ? { key, dir: -sort.dir } : { key, dir: 1 })} aria-label={`Sort by ${label}`}>
      {label}<SortI />
    </button>
  );
  return (
    <div className="wl-list" role="table">
      <div className="wl-list__head" role="row">
        <span>Product Image</span>{head("name", "Product Name")}{head("price", "Current Price")}<span>Status</span><span />
      </div>
      {items.map((it) => {
        const ch = change(it);
        return (
          <div key={it.id} role="row" className={`wl-row${selected.includes(it.id) ? " is-selected" : ""}`} onClick={edit ? () => toggle(it.id) : undefined}>
            <Thumb item={it} className="wl-row__img" />
            <div><b>{it.name.split(",")[0]}</b><small>Starting Price: <strong>{peso2(it.original)}</strong></small></div>
            <span className="wl-row__price">{peso2(it.price)}</span>
            <span className={`wl-row__status${ch < 0 ? " is-down" : ch > 0 ? " is-up" : ""}`}>{ch > 0 ? "+" : ""}{ch} %</span>
            <button type="button" className="wl-btn wl-btn--primary" onClick={(e) => { e.stopPropagation(); if (!edit) open(it.id); }}>View Product</button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- page ---------- */
export default function Watchlist({ items, collections = [], openId, onOpened, onAdd, onUpdate, onDelete }) {
  const [view, setView] = useState("card");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState(false);
  const [selected, setSelected] = useState([]);
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [detailId, setDetailId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState(null); // array of ids to delete

  // Lets other pages (e.g. a collection) open a product straight away.
  useEffect(() => {
    if (openId) { setDetailId(openId); onOpened?.(); }
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    let list = items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (sort.key) list = [...list].sort((a, b) => (sort.key === "name" ? a.name.localeCompare(b.name) : a.price - b.price) * sort.dir);
    return list;
  }, [items, query, sort]);

  const detail = items.find((i) => i.id === detailId);
  const editing = items.find((i) => i.id === editingId);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = shown.length > 0 && shown.every((i) => selected.includes(i.id));
  const toggleEdit = () => { setEdit(!edit); setSelected([]); };

  const doDelete = () => {
    onDelete(confirm);
    setConfirm(null); setDetailId(null); setSelected([]); setEdit(false);
  };

  return (
    <div className="wl">
      <header className="wl-top">
        <h1>Watchlist</h1>
        <label className="wl-search"><SearchI /><input type="search" placeholder="Search your watchlist" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search your watchlist" /></label>
        <button type="button" className="wl-tool" onClick={onAdd}><PlusI />Add item</button>
        <button type="button" className={`wl-tool${edit ? " is-on" : ""}`} onClick={toggleEdit} aria-pressed={edit} disabled={!items.length}><PencilI />Edit watchlist</button>
        <div className="wl-toggle" role="group" aria-label="View">
          <button type="button" aria-label="Card view" aria-pressed={view === "card"} className={view === "card" ? "is-on" : ""} onClick={() => setView("card")}><GridI /></button>
          <button type="button" aria-label="List view" aria-pressed={view === "list"} className={view === "list" ? "is-on" : ""} onClick={() => setView("list")}><ListI /></button>
        </div>
      </header>

      {edit && (
        <div className="wl-editbar">
          <p>Pick items you want to delete.</p>
          <button type="button" className="wl-red" onClick={() => setSelected(allSelected ? [] : shown.map((i) => i.id))}>
            <span className={`wl-box${allSelected ? " is-on" : ""}`} />Select All
          </button>
          <button type="button" className="wl-red wl-red--strong" disabled={!selected.length} onClick={() => setConfirm(selected)}><TrashI />Delete items</button>
        </div>
      )}

      {!items.length ? (
        <section className="wl-empty">
          <img src={sleep} alt="Pixie sleeping" />
          <h2>It's quiet in here.</h2>
          <p>Paste your first link to start tracking prices.</p>
          <button type="button" className="wl-btn wl-btn--primary" onClick={onAdd}>+ Add your first item</button>
        </section>
      ) : !shown.length ? (
        <section className="wl-empty wl-empty--sm"><h2>No matches.</h2><p>Nothing in your watchlist matches “{query}”.</p></section>
      ) : view === "card" ? (
        <CardView items={shown} edit={edit} selected={selected} toggle={toggle} open={setDetailId} />
      ) : (
        <ListView items={shown} edit={edit} selected={selected} toggle={toggle} open={setDetailId} sort={sort} setSort={setSort} />
      )}

      {detail && !editing && !confirm && (
        <ProductModal item={detail} onClose={() => setDetailId(null)} onUpdate={onUpdate}
          onEdit={() => setEditingId(detail.id)} onDelete={() => setConfirm([detail.id])} />
      )}
      {editing && <UpdateItem item={editing} collections={collections} onClose={() => setEditingId(null)} onSave={(u) => { onUpdate(u); setEditingId(null); }} />}
      {confirm && <ConfirmDelete onCancel={() => setConfirm(null)} onConfirm={doDelete} />}
    </div>
  );
}