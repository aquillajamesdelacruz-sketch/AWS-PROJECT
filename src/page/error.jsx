import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="route-error">
      <p className="route-error__code">404</p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Back to PeekyFox</Link>
    </main>
  );
}
