import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { auth, getUserProfile, watchAuth } from "./lib/firebase.js";
import { GuestOnly, RequireAuth } from "./Layout/RouteGuards.jsx";
import "./App.css";

const LandingPage = lazy(() => import("./page/landing.jsx"));
const LoginPage = lazy(() => import("./page/login.jsx"));
const RegisterPage = lazy(() => import("./page/register.jsx"));
const DashboardPage = lazy(() => import("./page/dashboard.jsx"));
const NotFoundPage = lazy(() => import("./page/error.jsx"));

const nameFromEmail = (email = "") =>
  email.split("@")[0].split(/[._-]+/).filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

function PageFallback() {
  return <main className="route-loading"><p>Loading page...</p></main>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = watchAuth(async (user) => {
      if (!mounted) return;
      setCurrentUser(user || null);
      if (!user) {
        setUserName("");
        setAuthReady(true);
        return;
      }

      // Set a useful fallback immediately; replace it with the saved profile name when available.
      setUserName(user.displayName || nameFromEmail(user.email) || "Friend");
      setAuthReady(true);
      try {
        const profile = await getUserProfile(user.uid);
        if (mounted && profile?.username) setUserName(profile.username);
      } catch (error) {
        console.warn("Could not load the user profile:", error);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleAuthenticated = ({ email, name, fullName }) => {
    setCurrentUser(auth.currentUser);
    setUserName(fullName || name || nameFromEmail(email) || "Friend");
  };

  //changed this into react route
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<GuestOnly authReady={authReady} user={currentUser} />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage onLogin={handleAuthenticated} />} />
          <Route path="/register" element={<RegisterPage onSignUp={handleAuthenticated} />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
        </Route>

        <Route element={<RequireAuth authReady={authReady} user={currentUser} />}>
          <Route
            path="/dashboard/*"
            element={<DashboardPage userName={userName || "Friend"} onDeleteAccount={() => setUserName("")} />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
