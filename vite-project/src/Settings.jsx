import { useEffect, useState } from "react";
import "./Watchlist.css";
import "./Settings.css";
import { Modal } from "./Watchlist";

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
        <button key={key} type="button" role="radio" aria-checked={value === key} className={value === key ? "is-on" : ""} onClick={() => onChange(key)}>{text}</button>
      ))}
    </div>
  );
}

function ChangePassword({ onClose, onDone }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (form.next.length < 8) return setError("New password must be at least 8 characters.");
    if (form.next !== form.confirm) return setError("New passwords don't match.");
    // TODO: send the password change to your API
    onDone();
  };

  return (
    <Modal onClose={onClose} className="wl-modal--md st-modal">
      <header className="wl-modal__head">
        <div><h2>Change password</h2><p className="wl-muted">Pick something you haven’t used before.</p></div>
        <button type="button" className="wl-x" aria-label="Close" onClick={onClose}>×</button>
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
          <button type="submit" className="wl-btn wl-btn--primary">Update password</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Settings({ userName, onNameChange, settings, onSettings, items, onDeleteAccount }) {
  const [pwOpen, setPwOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const exportCsv = () => {
    if (!items.length) return setNotice("Nothing to export yet. Add an item first.");
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Name", "Store", "URL", "Current price", "Original price", "Target price", "Collection"];
    const rows = items.map((i) => [i.name, i.store, i.url, i.price, i.original, i.target, i.collection].map(esc).join(","));
    const blob = new Blob(["\ufeff" + [head.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "peekyfox-items.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice(`Exported ${items.length} ${items.length === 1 ? "item" : "items"}.`);
  };

  return (
    <div className="wl st">
      <h1 className="st-title">Settings</h1>
      {notice && <p className="st-notice" role="status">{notice}</p>}

      <section className="st-card">
        <header className="st-head"><h2>Profile</h2><button type="button" className="st-btn" onClick={() => setPwOpen(true)}>Change password</button></header>
        <div className="st-two">
          <div><label className="st-label" htmlFor="st-name">Name</label><input id="st-name" className="st-input" value={userName} onChange={(e) => onNameChange(e.target.value)} autoComplete="name" /></div>
          <div><label className="st-label" htmlFor="st-email">Email</label><input id="st-email" className="st-input" type="email" placeholder="Email address" value={settings.email} onChange={(e) => onSettings({ email: e.target.value })} autoComplete="email" /></div>
        </div>
      </section>

      <section className="st-card">
        <h2>Notifications</h2>
        <div className="st-line"><span>In-app alerts</span><Switch label="In-app alerts" checked={settings.inApp} onChange={(v) => onSettings({ inApp: v })} /></div>
        <div className="st-line"><span>Email alerts</span><Switch label="Email alerts" checked={settings.emailAlerts} onChange={(v) => onSettings({ emailAlerts: v })} /></div>
        <div className="st-line"><span>How often?</span><Chips label="How often" options={FREQUENCIES} value={settings.frequency} onChange={(v) => onSettings({ frequency: v })} /></div>
      </section>

      <section className="st-card">
        <h2>Preferences</h2>
        <div className="st-line"><span>Theme</span><Chips label="Theme" options={THEMES} value={settings.theme} onChange={(v) => onSettings({ theme: v })} /></div>
      </section>

      <section className="st-card">
        <h2>Danger zone</h2>
        <div className="st-danger">
          <button type="button" className="st-btn st-btn--wide" onClick={exportCsv}>Export items as CSV</button>
          <button type="button" className="st-btn st-btn--red" onClick={() => setDeleteOpen(true)}>Delete account</button>
        </div>
      </section>

      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} onDone={() => { setPwOpen(false); setNotice("Password updated."); }} />}
      {deleteOpen && (
        <Modal onClose={() => setDeleteOpen(false)} className="wl-modal--sm">
          <h2>Delete your account?</h2>
          <p className="wl-muted">This removes your items and collections. It can’t be undone.</p>
          <div className="wl-actions">
            <button type="button" className="wl-btn wl-btn--ghost" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button type="button" className="wl-btn wl-btn--danger" onClick={onDeleteAccount}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}