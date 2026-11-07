import GoogleIcon from "../component/GoogleIcon.jsx";
import PageHead from "../component/PageHead.jsx";

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/Logo.png";
import mascot from "../assets/Mascot.png";

import { login, resetPassword, googleSignIn, ensureUserRecord } from "../lib/firebase.js";
import { validateLogin, MESSAGES } from "../lib/validation/schemas.js";
import { loginErrorMessage } from "../lib/validation/authErrors.js";


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

const LogIn = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: location.state?.email || "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(location.state?.registered ? "Account ready. Sign in to continue." : "");


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

    if (!form.email.trim() && !form.password) {
      return setError(MESSAGES.auth.loginRequired);
    }

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
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };


  // Send a password-reset link to the email entered in the login form.
  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    const email = form.email.trim();
    if (!email) {
      setError("Enter your email address above first.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(email);
      setSuccess("If an account exists for this email, a password-reset link has been sent. Check your inbox and spam folder.");
    } catch (resetError) {
      const code = resetError?.code || "";
      if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a while before trying again.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your internet connection and try again.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Email/password sign-in is not enabled in Firebase Authentication.");
      } else {
        setError("Unable to send the reset email. Check your Firebase Authentication settings and try again.");
      }
    } finally {
      setResetLoading(false);
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
      navigate("/dashboard", { replace: true });
      
    } catch (error) {
      setError(loginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead title="Log in" description="Sign in to PeekyFox to check your price watchlist, collections and savings." />
      <main className="li-page">
      <div className="li-layout">

        {/* Left Section */}
        <section className="li-intro">

          <h2 className="li-title">
            Your favorites.<br />
            <span className="li-title__accent">Worth watching.</span>
          </h2>

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

          <Link className="li-brand" to="/" aria-label="PeekyFox home"><img
            className="li-card__logo"
            src={logo}
            alt="PeekyFox"
          /></Link>

          <h1 id="li-welcome" className="li-card__title">
            Welcome back!
          </h1>

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

              <button
                type="button"
                className="li-link li-forgot"
                onClick={handleForgotPassword}
                disabled={resetLoading || loading}
              >
                {resetLoading ? "Sending link..." : "Forgot password?"}
              </button>

            </div>


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
            <div className="li-error-slot" aria-live="assertive">
              {error && <p className="li-error" role="alert">{error}</p>}
            </div>
            {/* Create Account */}
            <p className="li-new">
              New to PeekyFox?{" "}
              <Link className="li-link" to="/register">
                Create an account
              </Link>
            </p>

          </form>
        </section>

      </div>

      {/* Footer */}
      <footer className="li-footer">
        <span>&copy; 2026 PeekyFox</span>
        <Link to="/privacy">Privacy</Link>
        <Link to="/help">Need help?</Link>
      </footer>

    </main>
    </>
  );
};

export default LogIn;
