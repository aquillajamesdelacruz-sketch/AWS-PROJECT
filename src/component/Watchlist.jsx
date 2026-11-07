import PlatformLogo from "./PlatformLogo.jsx";
import { productImage } from "../lib/media.js";
import { memberships } from "../lib/memberships.js";
import { CloseIcon } from "./Icons.jsx";
import Dialog from "./Dialog.jsx";
import { celebrate } from "../lib/celebrate.js";
import { useEffect, useMemo, useState } from "react";
import mascot from "../assets/Mascot.png";
import find from "../assets/find.png";
import sleep from "../assets/sleep.png";
import { timeAgo } from "../lib/Dashboardstats.js";
import { validateSearchQuery, CATEGORIES, DEFAULT_CATEGORY, MAX_WATCHLIST_ITEMS } from "../lib/validation/schemas.js";

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
// Real price history saved in Firebase (item.history = [{ price, at }]).
// Items saved before history existed fall back to a simple original -> current line.
// The chart needs at least 2 points, so a single entry is repeated.
const historyOf = (it) => {
  const h = Array.isArray(it.history) && it.history.length
    ? it.history
    : [{ price: it.original, at: it.createdAt }, { price: it.price, at: it.createdAt }];
  return h.length > 1 ? h : [h[0], h[0]];
};


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
const SortI = () => <I size={20}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></I>;

function Thumb({ item, className = "" }) {
  return item.image
    ? <img className={`wl-img ${className}`} src={productImage(item.image)} alt={item.name} loading="lazy" decoding="async" />
    : <span className={`wl-img wl-img--empty ${className}`} role="img" aria-label="No product photo"><I size={32}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></I></span>;
}

export function Modal({ onClose, children, className = "", ...props }) {
  return <Dialog onClose={onClose} className={`wl-modal ${className}`} {...props}>{children}</Dialog>;
}

function ProgressBar({ item }) {
  return (
    <div className="wl-prog" role="progressbar" aria-label="Progress toward target price" aria-valuenow={Math.round(progress(item) * 100)} aria-valuemin="0" aria-valuemax="100">
      <i style={{ width: `${progress(item) * 100}%` }} />
      <b />
    </div>
  );
}

/* ---------- confirm delete ---------- */
function ConfirmDelete({ items, onCancel, onConfirm }) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  return (
    <Modal onClose={busy ? () => {} : onCancel} className="wl-modal--sm" role="alertdialog" labelledBy="delete-product-title">
      <span className="wl-delete-symbol" aria-hidden="true"><TrashI /></span>
      <h2 id="delete-product-title">{items.length === 1 ? "Delete this item?" : `Delete ${items.length} items?`}</h2>
      <p className="wl-delete-names">{items.map(item => item.name).join(", ")}</p>
      {error && <p role="alert" className="ai-error">{error}</p>}
      <p className="wl-muted">You’ll have to add them again.</p>
      <div className="wl-actions">
        <button type="button" className="wl-btn wl-btn--ghost" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="wl-btn wl-btn--danger" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await onConfirm();}catch{setError("Could not delete the items. Please try again.");setBusy(false);}}}><TrashI />{busy?"Deleting...":items.length === 1 ? "Delete item" : "Delete items"}</button>
      </div>
    </Modal>
  );
}

/* ---------- update item ---------- */
function UpdateItem({ item, collections, onClose, onSave }) {
  const [name, setName] = useState(item.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState(String(item.price));
  const [target, setTarget] = useState(String(item.target));
  const [collection, setCollection] = useState(item.collection || "");
  const [category, setCategory] = useState(item.category || DEFAULT_CATEGORY);
  return (
    <Modal onClose={onClose} className="wl-modal--md">
      <header className="wl-modal__head">
        <div><h2>Update an item</h2><p className="wl-muted">Update your product’s detail anytime.</p></div>
        <button type="button" className="wl-x" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      </header>
      {error && <p className="ai-error" role="alert">{error}</p>}
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
        <div><label className="wl-label" htmlFor="u-cat">Category</label>
          <select id="u-cat" className="wl-input wl-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="wl-actions wl-actions--end wl-rule">
        <button type="button" className="wl-btn wl-btn--ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="wl-btn wl-btn--primary" disabled={!name.trim() || saving}
          onClick={async () => { setSaving(true); setError(""); try { await onSave({ ...item, name: name.trim(), price: parse(price), target: parse(target), collection, collections:[...new Set([collection,...memberships(item).filter(n=>n!==item.collection)].filter(Boolean))], category }); } catch { setError("Could not save the update. Please try again."); setSaving(false); } }}>{saving ? "Saving..." : "Save update"}</button>
      </div>
    </Modal>
  );
}

/* ---------- product details / price history ---------- */
export function ProductModal({ item, onClose, onEdit, onDelete, onUpdate, onBought, purchase, onUndo }) {
  const [confirmBuy,setConfirmBuy]=useState(false);
  const [hover,setHover]=useState(null);
  const [tab, setTab] = useState("details");
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState("");
  // changed: everything below is calculated from the item's real history (not demo data)
  const entries = useMemo(() => historyOf(item), [item]);
  const hist = entries.map((e) => Number(e.price) || 0);
  const n = hist.length;
  const lo = Math.min(...hist), hi = Math.max(...hist);
  const last = hist[n - 1] - hist[n - 2];                 // most recent price change
  const lastChangeAt = entries[n - 1].at;                 // when it happened
  const saved = item.original - item.price;
  // how many price drops in a row, counting back from the newest entry (for Pixie's tip)
  let dropsInRow = 0;
  for (let i = n - 1; i > 0 && hist[i] < hist[i - 1]; i--) dropsInRow++;

  const W = 720, H = 140, min = lo - (hi - lo) * 0.15, max = hi + Math.max((hi - lo) * 0.1, 1);
  const pts = hist.map((v, i) => [(i / (n - 1)) * W, H - ((v - min) / (max - min)) * H]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

  return (
    <Modal onClose={onClose} className="wl-modal--lg wl-product-modal" labelledBy="product-dialog-title">
      <h2 id="product-dialog-title" className="sr-only">{item.name}</h2>
      <img className="wl-peek" src={find} alt="" />
      <button type="button" className="wl-x wl-x--abs" aria-label="Close" onClick={onClose}><CloseIcon /></button>

      <div className="wl-tabs" role="group" aria-label="Product view">
        {[["details", "Product Details"], ["history", "Price History"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="wl-detail">
          <Thumb item={item} className="wl-detail__img" />
          <div className="wl-detail__info">
            <h2>{item.name.split(",")[0]}</h2>
            {item.url && <a className="wl-shop" href={item.url} target="_blank" rel="noreferrer"><PlatformLogo store={item.store} />View Product on {item.store || "store"}</a>}
            <s>{peso(item.original)}</s>
            <div className="wl-pricerow">
              <strong>{peso(item.price)}</strong>
              {saved > 0 && <span className="wl-pill wl-pill--green">Down by {peso(saved)}</span>}
            </div>
            <div className="wl-metaRow">
              <span className="wl-chip">Last update: <b>{timeAgo(lastChangeAt || item.createdAt)}</b></span>
              <span className="wl-orange">{item.price <= item.target ? "Target reached!" : `${peso(toTarget(item))} to target!`}</span>
            </div>
            <ProgressBar item={item} />
            <div className="wl-ends"><span>Original: {peso(item.original)}</span><span>Target: {peso(item.target)}</span></div>
            {!purchase && <div className="wl-alert">
              <div><b>Tracking Alert</b><p>Notify me when the price is at or below {peso(item.target)}.</p></div>
              <button type="button" role="switch" aria-label="Price tracking alert" aria-checked={item.alert} className={`wl-switch${item.alert ? " is-on" : ""}`}
                onClick={() => onUpdate({ ...item, alert: !item.alert })}><i /></button>
              <span>{item.alert ? "On" : "Off"}</span>
            </div>}
            <p className="wl-muted wl-meta">
              Category: {item.category || DEFAULT_CATEGORY}
              <br />Added: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Not recorded"}
              {purchase && <><br />Purchased: {new Date(purchase.boughtAt).toLocaleString()}</>}
              {item.expiresAt && <> · Alert expires: {new Date(`${item.expiresAt}T00:00:00`).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</>}
              {item.stockThreshold && <> · Stock alert at {item.stockThreshold}</>}
            </p>
          </div>
        </div>
      ) : (
        <div className="wl-hist">
          <div className="wl-chart">
            <span>PHP</span>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Price history chart" tabIndex={0}
              onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();const i=Math.round(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*(n-1));setHover({i,x:e.clientX,y:e.clientY});}}
              onPointerLeave={()=>setHover(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({i:n-1,x:r.left+r.width/2,y:r.top+24});}} onBlur={()=>setHover(null)}
              onKeyDown={e=>{if(e.key==="ArrowLeft" || e.key==="ArrowRight"){e.preventDefault();setHover(h=>({...h,i:Math.max(0,Math.min(n-1,(h?.i??0)+(e.key==="ArrowRight"?1:-1)))}));}}}>
              {[H * 0.1, H * 0.45, H - 1].map((y) => <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#fff" strokeOpacity=".85" />)}
              <path d={`${line} L${W} ${H} L0 ${H}Z`} fill="#fff" fillOpacity=".4" /><path d={line} fill="none" stroke="#fff" strokeWidth="3" />
            </svg>
            {hover && <div className="wl-chart-tooltip" role="status" style={{left:Math.max(8,Math.min(hover.x+12,window.innerWidth-232)),top:Math.max(8,Math.min(hover.y+12,window.innerHeight-140))}}><b>{entries[hover.i].at ? new Date(entries[hover.i].at).toLocaleString() : "Date not recorded"}</b><div>Price: {peso(hist[hover.i])}</div><div>Tax: {entries[hover.i].tax == null ? "Not provided" : peso(entries[hover.i].tax)}</div></div>}
          </div>
          <div className="wl-stats">
            {[["Total Change", "since last added", Math.abs(saved)], ["Last Change", timeAgo(lastChangeAt || item.createdAt), Math.abs(last)], ["Lowest Price", "since last added", lo], ["Highest Price", "since last added", hi]].map(([t, s, v]) => (
              <div key={t}><b>{t}</b><small>{s}</small><strong className={t === "Last Change" && last > 0 ? "is-red" : ""}>{compact(v)}</strong></div>
            ))}
          </div>
          <div className="wl-history-log" aria-label="Recorded prices">{entries.map((entry,index)=><div key={index}><time dateTime={entry.at ? new Date(entry.at).toISOString() : undefined}>{entry.at ? new Date(entry.at).toLocaleString() : "Date not recorded"}</time><strong>{peso(Number(entry.price)||0)}</strong><small>Tax: {entry.tax == null ? "Not provided" : peso(entry.tax)}</small></div>)}</div>
        </div>
      )}

      {buyError && <p className="ai-error" role="alert">{buyError}</p>}
      <div className={`wl-detail__foot${tab === "history" ? " has-tip" : ""}`}>
        {tab === "history" && (
          <div className="wl-tip">
            <img src={mascot} alt="Pixie" />
            <div><b>Pixie’s Tip:</b><p>{last > 0 ? "The price has increased. Consider waiting and keep your target alert on." : dropsInRow >= 2 ? `The price has dropped ${dropsInRow} times in a row! It is possible that it will go lower. However, be alert!` : saved > 0 ? "The price is lower than when you added it. I’ll keep watching for more." : "The price hasn’t dropped yet. I’ll keep watching it for you."}</p></div>
          </div>
        )}
        <div className="wl-actions wl-actions--end">
          {onDelete && <button type="button" className="wl-btn wl-btn--danger" onClick={onDelete}>Delete Item</button>}
          {/* added: moves the item to "Bought and Savings" */}
          {onBought && <button type="button" className="wl-btn wl-btn--ghost" onClick={()=>setConfirmBuy(true)}>Mark as bought</button>}
          {onUndo && <button type="button" className="wl-btn wl-btn--primary" disabled={buying} onClick={async()=>{setBuying(true);setBuyError("");try{await onUndo();onClose();}catch(e){setBuyError(e.message);setBuying(false);}}}>Undo mark as bought</button>}

          {onEdit && <button type="button" className="wl-btn wl-btn--primary" onClick={onEdit}>Edit Item</button>}
        </div>
      </div>
      {confirmBuy && <Modal onClose={()=>setConfirmBuy(false)} className="wl-modal--sm"><h2>Mark this item as bought?</h2><p>{item.name} will move to Bought and savings at {peso(item.price)}. You can undo this later.</p>{buyError && <p role="alert">{buyError}</p>}<div className="wl-actions"><button className="wl-btn" disabled={buying} onClick={()=>setConfirmBuy(false)}>Cancel</button><button className="wl-btn wl-btn--primary" disabled={buying} onClick={async()=>{setBuying(true);setBuyError("");try{await onBought(item);setConfirmBuy(false);}catch(e){setBuyError(e.message || "Could not save purchase.");setBuying(false);}}}>{buying?"Saving...":"Confirm purchase"}</button></div></Modal>}
    </Modal>
  );
}

/* ---------- views ---------- */
export function CardView({ items, edit, selected, toggle, open, onDelete, actionLabel = "View Product" }) {
  return (
    <div className="wl-cards">
      {items.map((it) => (
        <article key={it.id} className={`wl-card${selected.includes(it.id) ? " is-selected" : ""}`}>
          {edit && <label className="wl-selection"><input type="checkbox" checked={selected.includes(it.id)} onChange={() => toggle(it.id)} /><span>Select {it.name}</span></label>}
          {edit && <button type="button" className="wl-delete-item wl-card__delete" aria-label={`Delete ${it.name}`} title={`Delete ${it.name}`} onClick={() => onDelete(it.id)}><TrashI /></button>}
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
              <p>{it.price <= it.target ? "Target reached. Check the store before buying." : Number(it.history?.at(-1)?.price) > Number(it.history?.at(-2)?.price) ? "The price increased. Keep watching for a better moment." : it.price < it.original ? "The price is down. Your target alert will keep watch." : "Set a target and watch for a better price."}</p>
            </div>
            {!edit && <button type="button" className="wl-btn wl-btn--primary wl-btn--full" onClick={() => open(it.id)}>{actionLabel}</button>}
          </div>
        </article>
      ))}
    </div>
  );
}

function ListView({ items, edit, selected, toggle, open, onDelete, sort, setSort }) {
  const heading = (key, label) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" className="wl-sort" onClick={() => setSort(sort.key === key ? { key, dir: -sort.dir } : { key, dir: 1 })}>{label}<SortI /></button>
    </th>
  );
  return (
    <div className="wl-table-wrap">
      <div className="wl-mobile-sort"><label className="wl-label" htmlFor="watchlist-sort">Sort products</label><select id="watchlist-sort" className="wl-input" value={sort.key || "default"} onChange={(event) => setSort({key:event.target.value === "default" ? null : event.target.value,dir:1})}><option value="default">Recently added</option><option value="name">Product name</option><option value="price">Current price</option></select><button type="button" className="wl-btn wl-btn--ghost" onClick={() => setSort({...sort,dir:-sort.dir})} disabled={!sort.key}>{sort.dir === 1 ? "Ascending" : "Descending"}</button></div>
      <table className="wl-list">
        <caption className="sr-only">Tracked products and current prices</caption>
        <thead><tr><th scope="col">{edit ? "Select" : "Product image"}</th>{heading("name", "Product name")}{heading("price", "Current price")}<th scope="col">Change</th><th scope="col">Action</th></tr></thead>
        <tbody>{items.map((it) => {
          const ch = change(it);
          return <tr key={it.id} className={`wl-row${selected.includes(it.id) ? " is-selected" : ""}`}>
            <td data-label={edit ? "Select" : "Product image"}>{edit ? <label className="wl-selection"><input type="checkbox" checked={selected.includes(it.id)} onChange={() => toggle(it.id)} /><span className="sr-only">Select {it.name}</span></label> : <Thumb item={it} className="wl-row__img" />}</td>
            <td data-label="Product name"><b>{it.name}</b><small>Starting price: {peso2(it.original)}</small></td>
            <td data-label="Current price" className="wl-row__price">{peso2(it.price)}</td>
            <td data-label="Change" className={`wl-row__status${ch < 0 ? " is-down" : ch > 0 ? " is-up" : ""}`}>{ch > 0 ? "+" : ""}{ch}%</td>
            <td data-label="Action">{edit ? <button type="button" className="wl-delete-item" aria-label={`Delete ${it.name}`} onClick={() => onDelete(it.id)}><TrashI /><span>Delete</span></button> : <button type="button" className="wl-btn wl-btn--primary" aria-label={`View ${it.name}`} onClick={() => open(it.id)}>View product</button>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

/* ---------- page ---------- */
export default function Watchlist({ items, collections = [], openId, onOpened, onAdd, onUpdate, onDelete, onBought }) {
  const [view, setView] = useState("card");
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [category, setCategory] = useState("All");
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
    // an invalid search (special characters only, over 255 characters) is not applied
    const q = searchError ? "" : query.trim().toLowerCase();
    let list = items.filter((i) => i.name.toLowerCase().includes(q)
      && (category === "All" || (i.category || DEFAULT_CATEGORY) === category));
    if (sort.key) list = [...list].sort((a, b) => (sort.key === "name" ? a.name.localeCompare(b.name) : a.price - b.price) * sort.dir);
    return list;
  }, [items, query, searchError, category, sort]);

  const detail = items.find((i) => i.id === detailId);
  const watchlistFull = items.length >= MAX_WATCHLIST_ITEMS;
  const editing = items.find((i) => i.id === editingId);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSelected = shown.length > 0 && shown.every((i) => selected.includes(i.id));
  const toggleEdit = () => { setEdit(!edit); setSelected([]); };

  const doDelete = async () => {
    await onDelete(confirm);
    setSelected(ids => ids.filter(id => !confirm.includes(id)));
    if (confirm.includes(detailId)) setDetailId(null);
    if (items.every(item => confirm.includes(item.id))) setEdit(false);
    setConfirm(null);
  };

  return (
    <div className="wl">
      <header className="wl-top">
        <h1>Watchlist</h1>
        <label className="wl-search"><SearchI /><input type="search" placeholder="Search your watchlist" value={query} aria-label="Search your watchlist"
          aria-invalid={!!searchError}
          onChange={(e) => { const v = e.target.value; setQuery(v); setSearchError(v.trim() ? validateSearchQuery(v) : ""); }}
          onKeyDown={(e) => { if (e.key === "Enter") setSearchError(validateSearchQuery(query)); }} /></label>
        <select className="wl-tool wl-cat" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" className="wl-tool" onClick={onAdd} disabled={watchlistFull} title={watchlistFull ? "Watchlist is full. Remove an item to add another." : undefined}><PlusI />Add item</button>
        <button type="button" className={`wl-tool${edit ? " is-on" : ""}`} onClick={toggleEdit} aria-pressed={edit} disabled={!items.length}><PencilI />Edit watchlist</button>
        <div className="wl-toggle" role="group" aria-label="View">
          <button type="button" aria-label="Card view" aria-pressed={view === "card"} className={view === "card" ? "is-on" : ""} onClick={() => setView("card")}><GridI /></button>
          <button type="button" aria-label="List view" aria-pressed={view === "list"} className={view === "list" ? "is-on" : ""} onClick={() => setView("list")}><ListI /></button>
        </div>
      </header>

      <p className="wl-count" aria-label={`${items.length} of ${MAX_WATCHLIST_ITEMS} items`}>{items.length}/{MAX_WATCHLIST_ITEMS}</p>
      {searchError && <p className="wl-search-error" role="alert">{searchError}</p>}
      {watchlistFull && <p className="wl-search-error" role="status">Watchlist is full ({items.length}/{MAX_WATCHLIST_ITEMS}). Remove an item to add another.</p>}

      {edit && (
        <div className="wl-editbar">
          <p aria-live="polite">{selected.length === 1 ? "1 item selected" : `${selected.length} items selected`}</p>
          <label className="wl-selection"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : shown.map((i) => i.id))} />Select all</label>
          <button type="button" className="wl-delete-item" disabled={!selected.length} onClick={() => setConfirm(selected)}><TrashI />Delete selected</button>
          <button type="button" className="wl-edit-done" onClick={toggleEdit}>Done</button>
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
        <section className="wl-empty wl-empty--sm"><h2>No matches.</h2><p>{searchError || query.trim() ? "Nothing in your watchlist matches your search" : "Nothing in this category yet"}{category !== "All" ? ` in ${category}` : ""}.</p></section>
      ) : view === "card" ? (
        <CardView items={shown} edit={edit} selected={selected} toggle={toggle} open={setDetailId} onDelete={id => setConfirm([id])} />
      ) : (
        <ListView items={shown} edit={edit} selected={selected} toggle={toggle} open={setDetailId} onDelete={id => setConfirm([id])} sort={sort} setSort={setSort} />
      )}

      {detail && !editing && !confirm && (
        <ProductModal item={detail} onClose={() => setDetailId(null)} onUpdate={onUpdate}
          onBought={async (it) => { await onBought?.(it); setDetailId(null); }}
          onEdit={() => setEditingId(detail.id)} onDelete={() => setConfirm([detail.id])} />
      )}
      {editing && <UpdateItem item={editing} collections={collections} onClose={() => setEditingId(null)} onSave={async (u) => { await onUpdate(u); celebrate({ subtle: true }); setEditingId(null); }} />}
      {confirm && <ConfirmDelete items={items.filter(item => confirm.includes(item.id))} onCancel={() => setConfirm(null)} onConfirm={doDelete} />}
    </div>
  );
}
