import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { auth, getUserProfile, watchAuth } from "./lib/firebase.js";
import { GuestOnly, RequireAuth } from "./Layout/RouteGuards.jsx";

const LandingPage = lazy(() => import("./page/landing.jsx"));
const LoginPage = lazy(() => import("./page/login.jsx"));
const RegisterPage = lazy(() => import("./page/register.jsx"));
const DashboardPage = lazy(() => import("./page/dashboard.jsx"));
const InfoPage = lazy(() => import("./page/InfoPage.jsx"));
const NotFoundPage = lazy(() => import("./page/error.jsx"));

function PageFallback() {
  return <main className="route-loading" aria-busy="true"><p role="status">Loading page...</p><div className="route-skeleton" aria-hidden="true"><i /><i /><i /></div></main>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState("");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let version = 0;
    const unsubscribe = watchAuth(async (user) => {
      const request = ++version;
      if (!mounted) return;
      setCurrentUser(user || null);
      if (!user) {
        setUserName("");
        setAuthReady(true);
        return;
      }

      // Set a useful fallback immediately; replace it with the saved profile name when available.
      setUserName(user.displayName || "Friend");
      setAuthReady(true);
      try {
        const profile = await getUserProfile(user.uid);
        if (mounted && request === version && profile?.username) {
          const google = user.providerData?.some(provider => provider.providerId === "google.com");
          setUserName(!profile.nameEdited && google && user.displayName ? user.displayName : profile.username);
        }
      } catch (error) {
        console.warn("Could not load the user profile:", error);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleAuthenticated = ({ name, fullName }) => {
    setCurrentUser(auth.currentUser);
    setUserName(fullName || name || "Friend");
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

        <Route path="/privacy" element={<InfoPage kind="privacy" />} />
        <Route path="/help" element={<InfoPage kind="help" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
