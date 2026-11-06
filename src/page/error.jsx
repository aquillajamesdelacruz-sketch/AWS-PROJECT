import { Link } from "react-router-dom";
import PageHead from "../component/PageHead.jsx";

export default function NotFound() {
  return (
    <>
      <PageHead title="Page not found" />
      <main className="route-error">
      <p className="route-error__code">404</p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Back to PeekyFox</Link>
    </main>
    </>
  );
}
