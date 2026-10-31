import { useMemo, useState } from "react";
import "./Watchlist.css";
import "./Collection.css";
import mascot from "./assets/mascot.png";
import sleep from "./assets/sleep.png";
import { CardView, Modal } from "./Watchlist";
import { COLORS, statsFor } from "./Collectionstats";

const peso = (n) => "₱" + Math.round(n).toLocaleString("en-PH");

const I = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const SearchI = () => <I><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></I>;
const PlusI = () => <I><path d="M12 5v14M5 12h14" /></I>;
const PencilI = () => <I><path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" /></I>;
const GridI = () => <I><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></I>;
const ListI = () => <I><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></I>;
const TrashI = () => <I><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></I>;
const FlagI = () => <I size={26}><path d="M5 21V4h12l-2 4 2 4H5" /></I>;

/* ---------- create collection ---------- */
function CreateCollection({ existing, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (existing.some((n) => n.toLowerCase() === clean.toLowerCase())) return setError("You already have a collection with that name.");
    onCreate({ name: clean, color });
  };

  return (
    <Modal onClose={onClose} className="cl-modal">
      <header className="wl-modal__head">
        <div><h2>Create a new collection</h2><p className="wl-muted">Give your next little dream a home.</p></div>
        <button type="button" className="wl-x" aria-label="Close" onClick={onClose}>×</button>
      </header>
      <form onSubmit={submit}>
        <label className="wl-label" htmlFor="cl-name">Collection Name</label>
        <input id="cl-name" className="wl-input" placeholder="Travel Gear" maxLength={40} autoFocus
          value={name} onChange={(e) => { setName(e.target.value); setError(""); }} />
        {error && <p className="cl-error" role="alert">{error}</p>}

        <p className="wl-label cl-colorlabel" id="cl-color">Choose a color</p>
        <div className="cl-swatches" role="radiogroup" aria-labelledby="cl-color">
          {COLORS.map((c) => (
            <button key={c.value} type="button" role="radio" aria-checked={color === c.value} aria-label={c.name}
              className={`cl-swatch${color === c.value ? " is-on" : ""}`} style={{ "--c": c.value }} onClick={() => setColor(c.value)}>
              <i>{color === c.value && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</i>
            </button>
          ))}
        </div>

        <div className="wl-actions wl-rule">
          <button type="button" className="wl-btn wl-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="wl-btn wl-btn--primary" disabled={!name.trim()}>Create</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- detail ---------- */
function Detail({ collection, items, onBack, onViewItem, onAddItem }) {
  const [showAll, setShowAll] = useState(false);
  const s = statsFor(items);
  const shown = showAll ? items : items.slice(0, 4);
  const cur = Math.min(82, Math.max(18, s.progress * 100));

  return (
    <div className="wl cl">
      <button type="button" className="cl-back" onClick={onBack}>Back to Collections</button>
      <h1 className="cl-title">{collection.name}</h1>

      <section className="cl-banner">
        <img src={mascot} alt="Pixie" />
        <div className="cl-banner__body">
          {items.length ? (
            <>
              <h2>Current total is {s.percent}% close to your target price.</h2>
              <p>Pixie is keeping an eye on your {collection.name}.</p>
              <div className="cl-track">
                <div className="cl-track__bar"><i style={{ width: `${s.progress * 100}%` }} /></div>
                <span className="cl-dot cl-dot--start" />
                <span className="cl-dot" style={{ left: `${s.progress * 100}%` }} />
                <span className="cl-flag"><FlagI /></span>
                <small className="cl-lbl cl-lbl--start">Starting: {peso(s.start)}</small>
                <small className="cl-lbl" style={{ left: `${cur}%`, transform: "translateX(-50%)" }}>Current: {peso(s.current)}</small>
                <small className="cl-lbl cl-lbl--end">Goal: <b>{peso(s.goal)}</b></small>
              </div>
            </>
          ) : (
            <>
              <h2>Nothing in {collection.name} yet.</h2>
              <p>Add an item and choose this collection to start tracking it.</p>
            </>
          )}
        </div>
      </section>

      <div className="cl-sechead">
        <h2>Tracked items</h2>
        <span>{shown.length} of {items.length} items shown</span>
      </div>

      {items.length ? (
        <>
          <CardView items={shown} edit={false} selected={[]} toggle={() => {}} open={onViewItem} actionLabel="View in Watchlist" />
          {items.length > 4 && (
            <div className="cl-more"><button type="button" className="wl-btn wl-btn--ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "Show fewer" : `Show all ${items.length}`}</button></div>
          )}
        </>
      ) : (
        <div className="cl-none"><button type="button" className="wl-btn wl-btn--primary" onClick={onAddItem}>+ Add an item</button></div>
      )}
    </div>
  );
}

/* ---------- page ---------- */
export default function Collection({ items, collections, onCreate, onDelete, onViewItem, onAddItem }) {
  const [openId, setOpenId] = useState(null);
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState(false);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(false);

  const rows = useMemo(() => collections.map((c) => ({ ...c, items: items.filter((i) => i.collection === c.name) })), [collections, items]);
  const shown = rows.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const open = rows.find((c) => c.id === openId);
  const allSelected = shown.length > 0 && shown.every((c) => selected.includes(c.id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleEdit = () => { setEdit(!edit); setSelected([]); };

  if (open) {
    return <Detail collection={open} items={open.items} onBack={() => setOpenId(null)} onViewItem={onViewItem} onAddItem={onAddItem} />;
  }

  return (
    <div className="wl cl">
      <header className="wl-top">
        <h1>Collection</h1>
        <label className="wl-search"><SearchI /><input type="search" placeholder="Search your collection" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search your collection" /></label>
        <button type="button" className="wl-tool" onClick={() => setCreating(true)}><PlusI />Add collection</button>
        <button type="button" className={`wl-tool${edit ? " is-on" : ""}`} onClick={toggleEdit} aria-pressed={edit} disabled={!collections.length}><PencilI />Edit collection</button>
        <div className="wl-toggle" role="group" aria-label="View">
          <button type="button" aria-label="Grid view" aria-pressed={view === "grid"} className={view === "grid" ? "is-on" : ""} onClick={() => setView("grid")}><GridI /></button>
          <button type="button" aria-label="List view" aria-pressed={view === "list"} className={view === "list" ? "is-on" : ""} onClick={() => setView("list")}><ListI /></button>
        </div>
      </header>

      {edit && (
        <div className="wl-editbar">
          <p>Pick collections you want to delete.</p>
          <button type="button" className="wl-red" onClick={() => setSelected(allSelected ? [] : shown.map((c) => c.id))}><span className={`wl-box${allSelected ? " is-on" : ""}`} />Select All</button>
          <button type="button" className="wl-red wl-red--strong" disabled={!selected.length} onClick={() => setConfirm(true)}><TrashI />Delete collections</button>
        </div>
      )}

      {!collections.length ? (
        <section className="wl-empty">
          <img src={sleep} alt="Pixie sleeping" />
          <h2>No collections yet.</h2>
          <p>Group your wishlist items to keep things tidy.</p>
          <button type="button" className="wl-btn wl-btn--primary" onClick={() => setCreating(true)}>Create a Collection</button>
        </section>
      ) : !shown.length ? (
        <section className="wl-empty wl-empty--sm"><h2>No matches.</h2><p>No collection matches “{query}”.</p></section>
      ) : (
        <div className={`cl-list cl-list--${view}`}>
          {shown.map((c) => {
            const s = statsFor(c.items);
            const picked = selected.includes(c.id);
            return (
              <button key={c.id} type="button" className={`cl-card${picked ? " is-selected" : ""}`} style={{ "--c": c.color }}
                onClick={() => (edit ? toggle(c.id) : setOpenId(c.id))}>
                <small>{c.items.length} {c.items.length === 1 ? "item" : "items"}</small>
                <h3>{c.name}</h3>
                <strong>{peso(s.current)}</strong>
                <span className="cl-bar" role="progressbar" aria-valuenow={s.percent} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${s.progress * 100}%` }} /></span>
              </button>
            );
          })}
          {!edit && (
            <div className="cl-new">
              <span className="cl-new__plus">+</span>
              <button type="button" className="wl-btn wl-btn--ghost" onClick={() => setCreating(true)}>New collection</button>
            </div>
          )}
        </div>
      )}

      {creating && <CreateCollection existing={collections.map((c) => c.name)} onClose={() => setCreating(false)} onCreate={(c) => { onCreate(c); setCreating(false); }} />}
      {confirm && (
        <Modal onClose={() => setConfirm(false)} className="wl-modal--sm">
          <h2>Are you sure you want to delete?</h2>
          <p className="wl-muted">Items inside stay in your watchlist.</p>
          <div className="wl-actions">
            <button type="button" className="wl-btn wl-btn--ghost" onClick={() => setConfirm(false)}>Cancel</button>
            <button type="button" className="wl-btn wl-btn--danger" onClick={() => { onDelete(selected); setConfirm(false); setSelected([]); setEdit(false); }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}