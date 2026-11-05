import { Navigate, Outlet, useLocation } from "react-router-dom";

function LoadingScreen() {
  return (
    <main className="route-loading" role="status" aria-live="polite">
      <p>Loading PeekyFox...</p>
    </main>
  );
}

export function RequireAuth({ authReady, user }) {
  const location = useLocation();
  if (!authReady) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function GuestOnly({ authReady, user }) {
  if (!authReady) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
