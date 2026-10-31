import { useState } from "react";
import LandingPage from "./LandingPage";
import LogIn from "./LogIn";
import SignUp from "./SignUp";
import Dashboard from "./Dashboard";

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

  const goTo = (p) => () => setPage(p);

  const handleLogin = ({ email, name }) => {
    setUserName(name || nameFromEmail(email) || "Friend");
    setPage("dashboard");
  };

  const handleSignUp = ({ fullName, email }) => {
    setUserName(fullName || nameFromEmail(email) || "Friend");
    setPage("dashboard");
  };

  if (page === "login") return <LogIn onLogin={handleLogin} onCreateAccount={goTo("signup")} />;
  if (page === "signup") return <SignUp onSignUp={handleSignUp} onBackToLogin={goTo("login")} />;
  if (page === "dashboard") return <Dashboard userName={userName} onDeleteAccount={() => { setUserName(""); setPage("landing"); }} />;
  return <LandingPage onSignUp={goTo("login")} onStartTracking={goTo("login")} />;
}