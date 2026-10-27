import { useState } from "react";
import "./LogIn.css";
import "./SignUp.css";
import logo from "./assets/logo.png";
import mascot from "./assets/mascot.png";

function EyeIcon({ off }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function SignUp({ onSignUp, onBackToLogin }) {
  const [form, setForm] = useState({ email: "", fullName: "", contact: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^[0-9+\s()-]{7,20}$/.test(form.contact.trim())) return setError("Enter a valid contact number.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    setError("");
    // TODO: send the new account to your API before continuing
    onSignUp?.({ email: form.email.trim(), fullName: form.fullName.trim(), contact: form.contact.trim() });
  };

  return (
    <main className="li-page su">
      <div className="li-layout">
        <section className="li-intro">
          <h1 className="li-title">
            Join the fun
            <br />
            with <span className="li-title__accent">PIXIE!</span>
          </h1>
          <p className="li-sub">Create an account and start catching price drops today.</p>

          <div className="li-stage">
            <div className="li-stage__circle" />
            <div className="li-stage__shadow" />
            <img className="li-stage__fox" src={mascot} alt="PeekyFox mascot waving" />
          </div>
        </section>

        <section className="li-card" aria-labelledby="su-title">
          <img className="li-card__logo" src={logo} alt="PeekyFox" />
          <h2 id="su-title" className="li-card__title">Create your account</h2>
          <p className="li-card__sub">It only takes a minute.</p>

          <form className="li-form" onSubmit={handleSubmit} noValidate={false}>
            <label className="li-label" htmlFor="su-email">Email</label>
            <input id="su-email" className="li-input" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />

            <label className="li-label" htmlFor="su-name">Full name</label>
            <input id="su-name" className="li-input" type="text" autoComplete="name" value={form.fullName} onChange={set("fullName")} required />

            <label className="li-label" htmlFor="su-contact">Contact number</label>
            <input id="su-contact" className="li-input" type="tel" autoComplete="tel" inputMode="tel" value={form.contact} onChange={set("contact")} required />

            <label className="li-label" htmlFor="su-password">Password</label>
            <input id="su-password" className="li-input" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} value={form.password} onChange={set("password")} required />

            <label className="li-label" htmlFor="su-confirm">Confirm password</label>
            <input id="su-confirm" className="li-input" type={show ? "text" : "password"} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />

            <div className="li-row">
              <button type="button" className="li-show" onClick={() => setShow(!show)} aria-pressed={show}>
                <EyeIcon off={show} /> Show password
              </button>
            </div>

            {error && <p className="li-error su-error" role="alert">{error}</p>}

            <button type="submit" className="li-submit su-submit">Create account</button>

            <p className="li-new">
              Already have an account?{" "}
              <a className="li-link" href="#login" onClick={(e) => { e.preventDefault(); onBackToLogin?.(); }}>Sign in</a>
            </p>
          </form>
        </section>
      </div>

      <footer className="li-footer">
        <span>© 2026 PeekyFox</span>
        <a href="#privacy">Privacy</a>
        <a href="#help">Need help?</a>
      </footer>
    </main>
  );
}