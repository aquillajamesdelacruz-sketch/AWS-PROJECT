
import { useState } from "react";
import "./LogIn.css";
import logo from "./assets/Logo.png";
import mascot from "./assets/Mascot.png";

import { login, googleSignIn, ensureUserRecord } from "./firebase/firebase.js";
import { validateLogin, MESSAGES } from "./validation/schemas.js";
import { loginErrorMessage } from "./validation/authErrors.js";

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z"/>
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

function EyeIcon({ off }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

const LogIn = ({ onLogin, onCreateAccount }) => {

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value
    });
  };

  // Handle email and password login
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const problem = validateLogin(form);
    if (problem) return setError(problem);

    setLoading(true);

    try {
      const credential = await login(form.email.trim(), form.password);

      setSuccess(MESSAGES.auth.loginSuccess);
      await new Promise((resolve) => setTimeout(resolve, 900));   // let the message be seen

      onLogin?.({
        email: credential.user.email || form.email.trim(),
        name: credential.user.displayName || ""
      });
    } catch (error) {
      setError(loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogle = async () => {
    setError("");
    setLoading(true);

    try {
      const credential = await googleSignIn();

      // added: first-time Google users have no profile in the database yet, so create one
      const profile = await ensureUserRecord(credential.user);

      onLogin?.({
        email: credential.user.email || "",
        name: profile?.username || credential.user.displayName || ""
      });
      
    } catch (error) {
      setError(loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="li-page">
      <div className="li-layout">

        {/* Left Section */}
        <section className="li-intro">

          <h1 className="li-title">
            Track your favorites
            <br />
            with <span className="li-title__accent">PIXIE!</span>
          </h1>

          <p className="li-sub">
            Track your favorites, catch price drops, and save more.
          </p>

          <div className="li-stage">
            <div className="li-stage__circle" />
            <div className="li-stage__shadow" />

            <img
              className="li-stage__fox"
              src={mascot}
              alt="PeekyFox mascot waving"
            />
          </div>

        </section>

        {/* Login Card */}
        <section className="li-card" aria-labelledby="li-welcome">

          <img
            className="li-card__logo"
            src={logo}
            alt="PeekyFox"
          />

          <h2 id="li-welcome" className="li-card__title">
            Welcome back!
          </h2>

          <p className="li-card__sub">
            Sign in to keep an eye on your favorites.
          </p>

          <form className="li-form" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <label className="li-label" htmlFor="li-email">
              Email
            </label>

            <input
              id="li-email"
              className="li-input"
              type="email"
              name="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
            />

            {/* Password */}
            <label className="li-label" htmlFor="li-password">
              Password
            </label>

            <input
              id="li-password"
              className="li-input"
              type={show ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
            />

            {/* Show Password and Forgot Password */}
            <div className="li-row">

              <button
                type="button"
                className="li-show"
                onClick={() => setShow(!show)}
                aria-pressed={show}
              >
                <EyeIcon off={show} />
                Show password
              </button>

              <a className="li-link" href="#forgot">
                Forgot password?
              </a>

            </div>

            <div className="li-divider">
              <span>or</span>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              className="li-google"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Error Message */}
            {error && (
              <p className="li-error" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="li-success" role="status">
                {success}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="li-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {/* Create Account */}
            <p className="li-new">
              New to PeekyFox?{" "}
              <a
                className="li-link"
                href="#signup"
                onClick={(e) => {
                  e.preventDefault();

                  if (onCreateAccount) {
                    onCreateAccount();
                  }
                }}
              >
                Create an account
              </a>
            </p>

          </form>
        </section>

      </div>

      {/* Footer */}
      <footer className="li-footer">
        <span>© 2026 PeekyFox</span>
        <a href="#privacy">Privacy</a>
        <a href="#help">Need help?</a>
      </footer>

    </main>
  );
};

export default LogIn;
