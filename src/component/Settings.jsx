import { CloseIcon } from "./Icons.jsx";
import { useEffect, useState } from "react";
import { Modal } from "./Watchlist.jsx";
import { changePassword } from "../lib/firebase.js";
import { validateStockThreshold, MESSAGES, MAX_STOCK, DEFAULT_STOCK_THRESHOLD } from "../lib/validation/schemas.js";

const FREQUENCIES = [["instant", "Instant"], ["daily", "Daily digest"]];
const THEMES = [["light", "Light"], ["dark", "Dark"], ["system", "Match device"]];

function Switch({ checked, onChange, label }) {
  return (
    <div className="st-switch">
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`wl-switch${checked ? " is-on" : ""}`} onClick={() => onChange(!checked)}><i /></button>
      <span>{checked ? "On" : "Off"}</span>
    </div>
  );
}

function Chips({ options, value, onChange, label }) {
  return (
    <div className="st-chips" role="radiogroup" aria-label={label}>
      {options.map(([key, text]) => (
        <label key={key} className={value === key ? "is-on" : ""}><input type="radio" name={label} value={key} checked={value === key} onChange={() => onChange(key)} />{text}</label>
      ))}
    </div>
  );
}

function ChangePassword({ onClose, onDone }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const [confirming,setConfirming]=useState(false);
  const [saving, setSaving] = useState(false);   // added: disables the button while Firebase works

  // changed: really updates the Firebase password (re-checks the current password first)
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 8) return setError("New password must be at least 8 characters.");
    if (form.next !== form.confirm) return setError("New passwords don't match.");
    if (form.next === form.current) return setError("Pick a password that is different from the current one.");

    setConfirming(true);
  };
  const savePassword = async () => {
    setSaving(true);
    try {
      await changePassword(form.current, form.next);
      onDone();
    } catch (err) {
      const wrong = ["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"];
      setConfirming(false);
      setError(
        wrong.includes(err.code) ? "Your current password is incorrect."
        : err.code === "auth/too-many-requests" ? "Too many attempts. Please wait a bit and try again."
        : err.message
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} className="wl-modal--md st-modal">
      <header className="wl-modal__head">
        <div><h2>Change password</h2><p className="wl-muted">Pick something you haven’t used before.</p></div>
        <button type="button" className="wl-x" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      </header>
      <form onSubmit={submit}>
        <label className="wl-label" htmlFor="pw-cur">Current password</label>
        <input id="pw-cur" className="wl-input" type="password" autoComplete="current-password" value={form.current} onChange={set("current")} required />
        <label className="wl-label st-gap" htmlFor="pw-new">New password</label>
        <input id="pw-new" className="wl-input" type="password" autoComplete="new-password" value={form.next} onChange={set("next")} required />
        <label className="wl-label st-gap" htmlFor="pw-con">Confirm new password</label>
        <input id="pw-con" className="wl-input" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
        {error && <p className="st-error" role="alert">{error}</p>}
        <div className="wl-actions wl-rule">
          <button type="button" className="wl-btn wl-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="wl-btn wl-btn--primary" disabled={saving}>{saving ? "Updating..." : "Update password"}</button>
        </div>
      </form>
      {confirming && <Modal onClose={()=>setConfirming(false)} className="wl-modal--sm"><h2>Confirm password change</h2><p>Your current password will be verified before the new password is saved.</p><div className="wl-actions"><button className="wl-btn" disabled={saving} onClick={()=>setConfirming(false)}>Cancel</button><button className="wl-btn wl-btn--primary" disabled={saving} onClick={savePassword}>{saving?"Updating...":"Confirm change"}</button></div></Modal>}
    </Modal>
  );
}

export default function Settings({ userName, onNameChange, settings, onSettings, items, onDeleteAccount }) {
  const [section,setSection]=useState("general");
  const [editingName,setEditingName]=useState(false);
  const [draftName,setDraftName]=useState(userName);
  const [nameSaving,setNameSaving]=useState(false);
  const [deleteError, setDeleteError] = useState("");   // added: shown inside the delete modal
  const [deleting, setDeleting] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const flash = (message, isError = false) => { setNoticeError(isError); setNotice(message); };

  // stock threshold: validated while typing, saved when the field loses focus
  const [stockText, setStockText] = useState(String(settings.stockThreshold ?? DEFAULT_STOCK_THRESHOLD));
  const [stockError, setStockError] = useState("");
  useEffect(() => { setStockText(String(settings.stockThreshold ?? DEFAULT_STOCK_THRESHOLD)); }, [settings.stockThreshold]);
  const saveStock = async () => {
    const problem = validateStockThreshold(stockText);
    setStockError(problem);
    if (problem || Number(stockText) === settings.stockThreshold) return;
    const failure = await onSettings({ stockThreshold: Number(stockText) });
    failure ? flash(failure, true) : flash(MESSAGES.stock.saved);
  };

  // notification switches / chips: Dashboard validates (null / undefined are rejected) and saves
  const saveNotification = async (patch) => {
    const failure = await onSettings(patch);
    failure ? flash(failure, true) : flash(MESSAGES.notifications.saved);
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const exportCsv = () => {
    if (!items.length) return flash("Nothing to export yet. Add an item first.", true);
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Name", "Store", "URL", "Current price", "Original price", "Target price", "Collection"];
    const rows = items.map((i) => [i.name, i.store, i.url, i.price, i.original, i.target, i.collection].map(esc).join(","));
    const blob = new Blob(["\ufeff" + [head.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "peekyfox-items.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    flash(`Exported ${items.length} ${items.length === 1 ? "item" : "items"}.`);
  };

  return (
    <div className="wl st">
      <h1 className="st-title">Settings</h1><div className="wl-tabs" role="group" aria-label="Settings section">{["general","account"].map(key=><button key={key} type="button" aria-pressed={section===key} className={section===key?"is-on":""} onClick={()=>setSection(key)}>{key==="general"?"General settings":"Account settings"}</button>)}</div>
      {notice && <p className={`st-notice${noticeError ? " st-notice--error" : ""}`} role={noticeError ? "alert" : "status"}>{notice}</p>}

      {section==="account" && <section className="st-card">
        <header className="st-head"><h2>Account</h2><button type="button" className="st-btn" onClick={()=>setPwOpen(true)}>Change password</button></header>
        <div className="st-profile-name"><strong>{userName}</strong><button className="st-btn st-profile-name__edit" type="button" aria-label="Edit display name" onClick={()=>{setDraftName(userName);setEditingName(true);}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 20 4-1L20 7l-3-3L5 16l-1 4Z"/></svg></button></div><p className="wl-muted">{settings.email}</p>
        {editingName && <form className="st-name-form" onSubmit={async e=>{e.preventDefault();if(!draftName.trim()) return;setNameSaving(true);try{await onNameChange(draftName.trim());setEditingName(false);flash("Display name saved.");}catch{flash("Could not save your name. Try again.",true);}finally{setNameSaving(false);}}}><label className="st-label" htmlFor="st-name">Display name</label><input id="st-name" className="st-input" value={draftName} onChange={e=>setDraftName(e.target.value)} autoComplete="name" required/><div className="wl-actions"><button type="button" className="st-btn" onClick={()=>setEditingName(false)}>Cancel</button><button className="st-btn" disabled={nameSaving || !draftName.trim()}>Confirm and save name</button></div></form>}
      </section>}

      {section==="general" && <>
      <section className="st-card">
        <h2>Notifications</h2>
        <div className="st-line"><span>In-app alerts</span><Switch label="In-app alerts" checked={settings.inApp} onChange={(v) => saveNotification({ inApp: v })} /></div>
        <div className="st-line"><span>Email alerts</span><Switch label="Email alerts" checked={settings.emailAlerts} onChange={(v) => saveNotification({ emailAlerts: v })} /></div>
        <div className="st-line"><span>Low-stock alert threshold (1-{MAX_STOCK})</span>
          <div>
            <input id="st-stock" className="st-input st-input--sm" inputMode="numeric" aria-label="Low-stock alert threshold" value={stockText}
              onChange={(e) => { setStockText(e.target.value); setStockError(validateStockThreshold(e.target.value)); }}
              onBlur={saveStock} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-invalid={!!stockError} aria-describedby={stockError ? "st-stock-error" : undefined} />
            {stockError && <p id="st-stock-error" className="st-error" role="alert">{stockError}</p>}
          </div>
        </div>
        <div className="st-line"><span>How often?</span><Chips label="How often" options={FREQUENCIES} value={settings.frequency} onChange={(v) => saveNotification({ frequency: v })} /></div>
      </section>

      <section className="st-card">
        <h2>Preferences</h2>
        <div className="st-line"><span>Theme</span><Chips label="Theme" options={THEMES} value={settings.theme} onChange={(v) => onSettings({ theme: v })} /></div>
      </section>

      </>}
      {section==="account" && <>
      <section className="st-card">
        <h2>Danger zone</h2>
        <div className="st-danger">
          <button type="button" className="st-btn st-btn--wide" onClick={exportCsv}>Export items as CSV</button>
          <button type="button" className="st-btn st-btn--red" onClick={() => setDeleteOpen(true)}>Delete account</button>
        </div>
      </section>

      </>}
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} onDone={() => { setPwOpen(false); flash("Password updated."); }} />}
      {deleteOpen && (
        <Modal onClose={() => setDeleteOpen(false)} className="wl-modal--sm">
          <h2>Delete your account?</h2>
          <p className="wl-muted">This removes your items and collections. It can’t be undone.</p>
          {deleteError && <p className="st-error" role="alert">{deleteError}</p>}
          <div className="wl-actions">
            <button type="button" className="wl-btn wl-btn--ghost" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button type="button" className="wl-btn wl-btn--danger" disabled={deleting}
              onClick={async () => {
                // changed: onDeleteAccount now returns an error message ("" when it worked)
                setDeleting(true); setDeleteError("");
                const message = await onDeleteAccount();
                if (message) { setDeleteError(message); setDeleting(false); }
              }}>{deleting ? "Deleting..." : "Delete"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}