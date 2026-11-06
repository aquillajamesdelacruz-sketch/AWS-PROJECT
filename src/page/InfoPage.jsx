import { Link } from "react-router-dom";
import logo from "../assets/Logo.png";
const faqs = [
 ["How do I track a product?", "Open Watchlist, choose Add item, paste the product link, then review the fetched details and set your target price before saving."],
 ["Are prices guaranteed?", "Prices and availability can change. Check the original store before buying. Price history reflects the updates recorded by PeekyFox."],
 ["Can an item belong to multiple collections?", "Yes. Open a collection and choose Add from Watchlist. Adding an item keeps its existing collection memberships."],
 ["How do I undo a purchase?", "Open Bought and savings, select the purchase, and choose Undo mark as bought. The item returns to your watchlist."],
 ["How do I manage my account?", "Open your profile menu and choose Settings. Account settings contains your display name, password controls, export, and account deletion."],
 ["Why do I sign in after creating an account?", "Registration returns you to Sign in with your email filled in. For Google accounts, choose Continue with Google."],
];
export default function InfoPage({kind}) {
 const privacy = kind === "privacy";
 return <main className="pf-info"><Link to="/" aria-label="PeekyFox home"><img src={logo} alt="PeekyFox" width="160" /></Link><h1>{privacy ? "Privacy policy" : "Help and frequently asked questions"}</h1>
 {privacy ? <>
 <p>This notice describes how this student project uses information in the current application.</p>
 <h2>Information you provide</h2><p>PeekyFox stores your account name and email, saved product links and images, price history, targets, collections, purchases, and preferences. Password authentication is handled by Firebase Authentication. Google sign-in supplies your account name and email.</p>
 <h2>How information is used</h2><p>Your data supports your watchlist, savings history, account settings, and alerts. Product links are sent to the product-fetching service. Uploaded product media is stored using Cloudinary. When enabled and configured, email price alerts use EmailJS.</p>
 <h2>Storage and service providers</h2><p>Account and application data is stored with Firebase. The application also initializes Firebase Analytics. Theme preferences and onboarding state may be saved in your browser. These providers process information under their own policies.</p>
 <h2>Your controls</h2><p>You can change alert preferences, export active watchlist items, and delete your account in Account settings. Account deletion removes your Firebase profile and authentication account; separately uploaded images, provider logs, and backups may remain under the providers' retention policies.</p>
 <h2>Questions</h2><p>Contact the project team at <a href="mailto:peekyfox@contact.com">peekyfox@contact.com</a> with privacy questions.</p>
 </> : <>{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}<p>Need more help? <a href="mailto:peekyfox@contact.com">Contact the project team</a>.</p></>}
 <nav aria-label="More information"><Link to="/login">Sign in</Link><Link to={privacy ? "/help" : "/privacy"}>{privacy ? "Need help?" : "Privacy policy"}</Link></nav></main>;
}
