import { memberships, inCollection } from "../lib/memberships.js";
import { CloseIcon } from "./Icons.jsx";
import { useMemo, useState } from "react";
import mascot from "../assets/Mascot.png";
import sleep from "../assets/sleep.png";
import { CardView, Modal } from "./Watchlist.jsx";
import { COLORS, statsFor } from "../lib/Collectionstats.js";

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
const FlagI = () => <I size={20}><path d="M5 21V4h12l-2 4 2 4H5" /></I>;

/* ---------- create collection ---------- */
function CreateCollection({ existing, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [error, setError] = useState("");

  const [saving,setSaving]=useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    if (existing.some((n) => n.toLowerCase() === clean.toLowerCase())) return setError("You already have a collection with that name.");
    setSaving(true); try { await onCreate({ name: clean, color }); } catch(e) { setError(e.message || "Could not create collection."); setSaving(false); }
  };

  return (
    <Modal onClose={onClose} className="cl-modal">
      <header className="wl-modal__head">
        <div><h2>Create a new collection</h2><p className="wl-muted">Give your next little dream a home.</p></div>
        <button type="button" className="wl-x" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      </header>
      <form onSubmit={submit}>
        <label className="wl-label" htmlFor="cl-name">Collection Name</label>
        <input id="cl-name" className="wl-input" placeholder="Travel Gear" maxLength={40} autoFocus
          value={name} onChange={(e) => { setName(e.target.value); setError(""); }} />
        {error && <p className="cl-error" role="alert">{error}</p>}

        <p className="wl-label cl-colorlabel" id="cl-color">Choose a color</p>
        <div className="cl-swatches" role="radiogroup" aria-labelledby="cl-color">
          {COLORS.map((c) => (
            <label key={c.value} className={`cl-swatch${color === c.value ? " is-on" : ""}`} style={{ "--c": c.value }}>
              <input type="radio" name="collection-color" value={c.value} checked={color === c.value} onChange={() => setColor(c.value)} aria-label={c.name} />
              <i>{color === c.value && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</i>
            </label>
          ))}
        </div>

        <div className="wl-actions wl-rule">
          <button type="button" className="wl-btn wl-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="wl-btn wl-btn--primary" disabled={saving || !name.trim()}>Create</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- detail ---------- */
function Detail({ collection, items, allItems, collectionNames, watchlistFull, onBack, onViewItem, onAddItem, onRename, onDelete, onAddMembers }) {
  const [manage,setManage]=useState(false);
  const [picker,setPicker]=useState(false);
  const [name,setName]=useState(collection.name);
  const [selected,setSelected]=useState([]);
  const [deleting,setDeleting]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const perform=async action=>{setBusy(true);setError("");try{await action();}catch(e){setError(e.message || "Could not save. Try again.");}finally{setBusy(false);}};
  const [showAll, setShowAll] = useState(false);
  const s = statsFor(items);
  const shown = showAll ? items : items.slice(0, 4);

  return (
    <div className="wl cl">
      <button type="button" className="cl-back" onClick={onBack}>Back to Collections</button>
      <div className="cl-detail-heading"><h1 className="cl-title">{collection.name}</h1><div className="wl-actions"><button className="wl-btn wl-btn--ghost" onClick={()=>{setManage(true);setError("");}}>Edit collection</button><button className="wl-btn wl-btn--primary" onClick={()=>{setPicker(true);setError("");}}>Add from Watchlist</button></div></div>

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
                <small className="cl-lbl cl-lbl--current">Current: {peso(s.current)}</small>
                <small className="cl-lbl cl-lbl--end">Goal: <b>{peso(s.goal)}</b></small>
              </div>
            </>
          ) : (
            <>
              <h2>Nothing in {collection.name} yet.</h2>
              <p>{watchlistFull ? "Your watchlist is full. Remove an item before adding another." : "Add an item and choose this collection to start tracking it."}</p>
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
        <div className="cl-none"><button type="button" className="wl-btn wl-btn--primary" onClick={onAddItem} disabled={watchlistFull}>+ Add an item</button></div>
      )}
      {manage && <Modal onClose={()=>setManage(false)} className="wl-modal--md"><h2>Edit collection</h2><label className="wl-label" htmlFor="collection-rename">Collection name</label><input id="collection-rename" className="wl-input" value={name} maxLength={40} onChange={e=>setName(e.target.value)} />{error && <p role="alert" className="cl-error">{error}</p>}<div className="wl-actions"><button className="wl-btn wl-btn--ghost" onClick={()=>setManage(false)}>Cancel</button><button className="wl-btn wl-btn--danger" onClick={()=>{setManage(false);setDeleting(true);}}>Delete collection</button><button className="wl-btn wl-btn--primary" disabled={busy || !name.trim()} onClick={()=>perform(async()=>{if(collectionNames.some(n=>n!==collection.name && n.toLowerCase()===name.trim().toLowerCase())) throw new Error("A collection already uses this name.");await onRename(collection,name.trim());setManage(false);})}>Save name</button></div></Modal>}
      {deleting && <Modal onClose={()=>setDeleting(false)} className="wl-modal--sm"><h2>Delete {collection.name}?</h2><p>Items stay in your watchlist and other collections.</p>{error && <p role="alert">{error}</p>}<div className="wl-actions"><button className="wl-btn" onClick={()=>setDeleting(false)}>Cancel</button><button className="wl-btn wl-btn--danger" disabled={busy} onClick={()=>perform(async()=>{await onDelete([collection.id]);onBack();})}>Delete collection</button></div></Modal>}
      {picker && <Modal onClose={()=>setPicker(false)} className="wl-modal--md"><h2>Add from Watchlist</h2><div className="cl-picker">{allItems.length===0 && <p>Your watchlist is empty.</p>}{allItems.map(item=>{const already=inCollection(item,collection.name);const others=memberships(item).filter(n=>n!==collection.name);return <label className="cl-picker__row" key={item.id}><input type="checkbox" checked={already || selected.includes(item.id)} disabled={already || busy} onChange={()=>setSelected(ids=>ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id])}/><span><b>{item.name}</b>{already && <small>Already in this collection</small>}{others.map(n=><small className="cl-membership" key={n}>Item is also in {n} collection</small>)}</span></label>;})}</div>{error && <p role="alert">{error}</p>}<div className="wl-actions"><button className="wl-btn" onClick={()=>setPicker(false)}>Cancel</button><button className="wl-btn wl-btn--primary" disabled={busy || !selected.length} onClick={()=>perform(async()=>{await onAddMembers(collection.name,allItems.filter(i=>selected.includes(i.id)));setSelected([]);setPicker(false);})}>{busy?"Adding...":"Add selected items"}</button></div></Modal>}
    </div>
  );
}

/* ---------- page ---------- */
export default function Collection({ items, collections, watchlistFull = false, onCreate, onDelete, onViewItem, onAddItem, onRename, onAddMembers }) {
  const [openId, setOpenId] = useState(null);
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState(false);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [deleteError,setDeleteError]=useState("");
  const [deleting,setDeleting]=useState(false);

  const rows = useMemo(() => collections.map((c) => ({ ...c, items: items.filter((i) => inCollection(i,c.name)) })), [collections, items]);
  const shown = rows.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));
  const open = rows.find((c) => c.id === openId);
  const allSelected = shown.length > 0 && shown.every((c) => selected.includes(c.id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleEdit = () => { setEdit(!edit); setSelected([]); };

  if (open) {
    return <Detail collection={open} items={open.items} allItems={items} collectionNames={collections.map(c=>c.name)} watchlistFull={watchlistFull} onRename={onRename} onDelete={onDelete} onAddMembers={onAddMembers} onBack={() => setOpenId(null)} onViewItem={onViewItem} onAddItem={onAddItem} />;
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
          <p aria-live="polite">{selected.length} collections selected</p><button type="button" className="wl-btn" onClick={toggleEdit}>Done</button>
          <button type="button" className="wl-red" aria-pressed={allSelected} onClick={() => setSelected(allSelected ? [] : shown.map((c) => c.id))}><span className={`wl-box${allSelected ? " is-on" : ""}`} />Select All</button>
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
              <button key={c.id} type="button" aria-pressed={edit ? picked : undefined} className={`cl-card${picked ? " is-selected" : ""}`} style={{ "--c": c.color }}
                onClick={() => (edit ? toggle(c.id) : setOpenId(c.id))}>
                <span className="cl-selection-badge" aria-hidden="true">{edit && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d={picked ? "m5 12 4 4 10-10" : ""}/></svg>}</span><small>{c.items.length} {c.items.length === 1 ? "item" : "items"}</small>
                <h3>{c.name}</h3>
                <strong>{peso(s.current)}</strong>
                <span className="cl-bar" role="progressbar" aria-label={`${c.name} target progress`} aria-valuenow={s.percent} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${s.progress * 100}%` }} /></span>
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

      {creating && <CreateCollection existing={collections.map((c) => c.name)} onClose={() => setCreating(false)} onCreate={async (c) => { await onCreate(c); setCreating(false); }} />}
      {confirm && (
        <Modal onClose={() => setConfirm(false)} className="wl-modal--sm">
          <h2>Are you sure you want to delete?</h2>
          <p className="wl-muted">Items inside stay in your watchlist.</p>{deleteError && <p role="alert">{deleteError}</p>}
          <div className="wl-actions">
            <button type="button" className="wl-btn wl-btn--ghost" onClick={() => setConfirm(false)}>Cancel</button>
            <button type="button" className="wl-btn wl-btn--danger" disabled={deleting} onClick={async () => {setDeleting(true);setDeleteError("");try{await onDelete(selected); setConfirm(false); setSelected([]); setEdit(false);}catch(e){setDeleteError(e.message || "Could not delete collections.");}finally{setDeleting(false);}}}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}