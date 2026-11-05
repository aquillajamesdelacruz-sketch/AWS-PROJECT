import { useEffect, useState } from "react";
import LandingPage from "./LandingPage";
import LogIn from "./LogIn";
import SignUp from "./Signup";
import Dashboard from "./Dashboard";
import { watchAuth, getUserProfile } from "./firebase/firebase";

// Turns "bea.shainne@mail.com" into "Bea Shainne"
const nameFromEmail = (email = "") =>
  email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

export default function App() {
  const [page, setPage] = useState("landing"); // "landing" | "login" | "signup" | "dashboard"
  const [userName, setUserName] = useState("");
  // added: true once Firebase has told us whether someone is already logged in (avoids a landing-page flash on refresh)
  const [authReady, setAuthReady] = useState(false);

  const goTo = (p) => () => setPage(p);

  // added: SESSION. Firebase remembers the login, so on refresh the user goes straight back to the
  // dashboard, and logging out (or deleting the account) from anywhere sends them to the landing page.
  useEffect(() => {
    return watchAuth(async (user) => {
      if (!user) {
        setUserName("");
        setPage((p) => (p === "dashboard" ? "landing" : p));
        setAuthReady(true);
        return;
      }

      setPage("dashboard");
      setAuthReady(true);

      // the display name comes from users/{uid}/username (saved at sign up / Google sign in)
      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.username) return setUserName(profile.username);
      } catch { /* profile not readable yet; use the fallback below */ }
      // fallback, but never overwrite a name the sign-up form already set
      setUserName((prev) => prev || user.displayName || nameFromEmail(user.email) || "Friend");
    });
  }, []);

  const handleLogin = ({ email, name }) => {
    setUserName(name || nameFromEmail(email) || "Friend");
    setPage("dashboard");
  };

  const handleSignUp = ({ fullName, email }) => {
    setUserName(fullName || nameFromEmail(email) || "Friend");
    setPage("dashboard");
  };

  if (!authReady) return null;

  if (page === "login") return <LogIn onLogin={handleLogin} onCreateAccount={goTo("signup")} />;
  if (page === "signup") return <SignUp onSignUp={handleSignUp} onBackToLogin={goTo("login")} />;
  if (page === "dashboard") return <Dashboard userName={userName || "Friend"} onDeleteAccount={() => { setUserName(""); setPage("landing"); }} />;
  return <LandingPage onSignUp={goTo("login")} onStartTracking={goTo("login")} />;
}
