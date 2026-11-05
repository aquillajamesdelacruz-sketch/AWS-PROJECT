import { useState } from "react";
import "./LogIn.css";
import "./Signup.css";
import logo from "./assets/Logo.png";
import mascot from "./assets/Mascot.png";

import { register } from "./firebase/firebase.js";
import { validateSignup, MESSAGES } from "./validation/schemas.js";
import { signupErrorMessage } from "./validation/authErrors.js";

function EyeIcon({ off }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

//fixed this ahh
const SignUp = ({ onSignUp, onBackToLogin }) => {
  const [form, setForm] = useState({ email: "", fullName: "", contact: "", password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  //added this loading errrr
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    const problem = validateSignup(form);
    if (problem) return setError(problem);
    setError("");
    setLoading(true);
    
      //send the info on firebase register function wit trycath
      try {
            const credential = await register(
              form.email.trim(),
              form.password,
              form.fullName.trim(),
              form.contact.trim()
            );

            setSuccess(MESSAGES.auth.signupSuccess);
            await new Promise((resolve) => setTimeout(resolve, 900));   // let the message be seen

            // Notify App.jsx so it can open the dashboard after registration.
            onSignUp?.({
              fullName: form.fullName.trim(),
              email: credential.user.email || form.email.trim()
            });
        } catch (error) {
            setError(signupErrorMessage(error))
        } finally {
            setLoading(false)
        }

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

          <form className="li-form" onSubmit={handleSubmit} noValidate>
            <label className="li-label" htmlFor="su-email">Email</label>
            <input id="su-email" className="li-input" type="email" autoComplete="email" value={form.email} onChange={set("email")} />

            <label className="li-label" htmlFor="su-name">Full name</label>
            <input id="su-name" className="li-input" type="text" autoComplete="name" value={form.fullName} onChange={set("fullName")} />

            <label className="li-label" htmlFor="su-contact">Contact number</label>
            <input id="su-contact" className="li-input" type="tel" autoComplete="tel" inputMode="tel" value={form.contact} onChange={set("contact")} />

            <label className="li-label" htmlFor="su-password">Password</label>
            <input id="su-password" className="li-input" type={show ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={set("password")} />

            <label className="li-label" htmlFor="su-confirm">Confirm password</label>
            <input id="su-confirm" className="li-input" type={show ? "text" : "password"} autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />

            <div className="li-row">
              <button type="button" className="li-show" onClick={() => setShow(!show)} aria-pressed={show}>
                <EyeIcon off={show} /> Show password
              </button>
            </div>

            {error && <p className="li-error su-error" role="alert">{error}</p>}
            {success && <p className="li-success su-error" role="status">{success}</p>}

            {/* added: disabled while Firebase is creating the account, so it cannot be submitted twice */}
            <button type="submit" className="li-submit su-submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>

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

export default SignUp;