import { useEffect, useRef, useState } from "react";
import "./Dashboard.css";
import "./Theme.css";
import logo from "./assets/Logo.png";
import mascot from "./assets/Mascot.png";
import find from "./assets/find.png";
import stocks from "./assets/stocks.png";
import sleep from "./assets/sleep.png";
import AddItemModal from "./Additemmodal";
import { validateWatchlistCount, validateNotificationPatch, NOTIFICATION_KEYS, MESSAGES, DEFAULT_STOCK_THRESHOLD } from "./validation/schemas";
import Watchlist from "./Watchlist";
import Collection from "./Collection";
import BoughtSavings from "./Boughtsavings";
import Settings from "./Settings";
import { statsFor } from "./Collectionstats";
import { buildNotifications } from "./Dashboardstats";
import DashboardHome, { Notifications } from "./Dashboardhome";

import { onAuthStateChanged } from "firebase/auth";
import {
  auth, addItem, listenItems, updateItem, deleteItem,
  addCollection, listenCollections, deleteCollections, updateUser,
  listenPurchases, markAsBought,
  listenSettings, saveSettings, deleteAccount, logout
} from "./firebase/firebase";

const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const NAV = [
  { label: "Dashboard", icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { label: "Watchlist", icon: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></> },
  { label: "Collection", icon: <><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></> },
  { label: "Bought and Savings", icon: <><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></> },
];

const getSteps = (firstName) => [
  {
    image: mascot,
    alt: "Pixie waving",
    title: <>Hi, {firstName}! My name is <span className="db-accent">PIXIE.</span></>,
    text: "Your personal price-tracking buddy! I'll keep an eye on your favorite products so you can buy them when the price is just right.",
  },
  {
    image: find,
    alt: "Pixie searching with a magnifying glass",
    title: <>Add what you <span className="db-accent">love.</span></>,
    text: "Paste a product link and I'll add it to your watchlist. I check prices for you, so you don't have to.",
  },
  {
    image: stocks,
    alt: "Pixie holding signs showing prices going up and down",
    title: <>Set a price, then <span className="db-accent">relax.</span></>,
    text: "Pick a target price and I'll let you know the moment it drops. A little patience, a better price.",
  },
];

const THEME_KEY = "peekyfox-theme";
const loadTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return ["light", "dark", "system"].includes(saved) ? saved : "light";
  } catch {
    return "light";
  }
};

export default function Dashboard({ userName: initialName = "Bea Shainne", onDeleteAccount }) {
  const [userName, setUserName] = useState(initialName);
  const [settings, setSettings] = useState({ email: "", inApp: true, emailAlerts: false, frequency: "instant", stockThreshold: DEFAULT_STOCK_THRESHOLD, theme: loadTheme() });
  const firstName = userName.split(" ")[0];
  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const STEPS = getSteps(firstName);
  const [active, setActive] = useState("Dashboard");
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");
  const [collections, setCollections] = useState([]);
  const [focusId, setFocusId] = useState(null);

  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);   // added: bought items from Firebase (feeds the savings charts)

  // Light / Dark / Match device. The result is set on <html data-theme="light|dark"> (styles are in Theme.css).
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && !!media?.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    try { localStorage.setItem(THEME_KEY, settings.theme); } catch { /* storage unavailable */ }
    media?.addEventListener?.("change", apply); // follows the device while "Match device" is picked
    return () => media?.removeEventListener?.("change", apply);
  }, [settings.theme]);

  // Back to the normal look when leaving the app (e.g. after deleting the account)
  useEffect(() => () => { delete document.documentElement.dataset.theme; }, []);
  const [notifOpen, setNotifOpen] = useState(false);

  const collectionNames = collections.map((c) => c.name);
  const collectionSummaries = collections.map((c) => ({ ...c, ...statsFor(items.filter((i) => i.collection === c.name)) }));

  const openAdd = (url = "") => { setQuickUrl(url); setAddOpen(true); };

  const isLast = step === STEPS.length - 1;
  const next = () => (isLast ? setOpen(false) : setStep(step + 1));

    // Listen for items AND collections in the database
      useEffect(() => {
      let unsubscribeItems = () => {};
      let unsubscribeCollections = () => {};   // added: collections listener
      let unsubscribePurchases = () => {};     // added: purchases listener
      let unsubscribeSettings = () => {};      // added: settings listener
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
  
        unsubscribeItems();
        unsubscribeCollections();
        unsubscribePurchases();
        unsubscribeSettings();
  
        if (user) {
          unsubscribeItems = listenItems(user.uid, (data) => {
            setItems(data);
          });
          // added: real-time collections, replaces the old local-only state
          unsubscribeCollections = listenCollections(user.uid, setCollections);
          // added: real-time purchases, so Bought and Savings + Dashboard totals update live
          unsubscribePurchases = listenPurchases(user.uid, setPurchases);
          // added: settings (email, alerts, frequency, theme, notification read time) are saved per user.
          // Defaults are kept for anything not saved yet; the email falls back to the login email.
          unsubscribeSettings = listenSettings(user.uid, (saved) =>
            setSettings((prev) => ({ ...prev, email: user.email || "", ...saved }))
          );
        } else {
          setItems([]);
          setCollections([]);
          setPurchases([]);
        }
      });
      return () => {
        unsubscribeAuth();
        unsubscribeItems();
        unsubscribeCollections();
        unsubscribePurchases();
        unsubscribeSettings();
      };
    }, []);
  
    // additem 
    const handleAddItem = async (item) => {
    const user = auth.currentUser;
  
      if (!user) {
        alert("Please log in first.");
        return;
      }

      // watchlist limit: item 51 is rejected (the modal shows this message)
      const limitError = validateWatchlistCount(items.length);
      if (limitError) throw new Error(limitError);
  
      // added: seed the price history so the charts have a starting point.
      // Two entries (original -> current) record the discount already present when added.
      const now = Date.now();
      const history = item.original > item.price
        ? [{ price: item.original, at: now }, { price: item.price, at: now }]
        : [{ price: item.price, at: now }];

      await addItem(user.uid, { ...item, history });
      };
      
      //updateItim
      const handleUpdateItem = async (item) => {
      const user = auth.currentUser;
  
      if (!user) return;
  
      const { id, ...updatedData } = item;

      // added: when the price changed, append it to the item's history.
      // The price charts and "Total Saved" trend are built from this list.
      const old = items.find((i) => i.id === id);
      if (old && Number(old.price) !== Number(updatedData.price)) {
        const history = Array.isArray(old.history) && old.history.length
          ? old.history
          : [{ price: old.price, at: old.createdAt || Date.now() }];
        updatedData.history = [...history, { price: updatedData.price, at: Date.now() }];
      }

      await updateItem(user.uid, id, updatedData);
  
      };
  
      // deleteItem
      const handleDeleteItems = async (ids) => {
        const user = auth.currentUser;
  
        if (!user) return;
  
        await Promise.all(
          ids.map((id) => deleteItem(user.uid, id))
        );
  
      };

  // added: "Mark as bought" -> moves the item into users/{uid}/purchases
  const handleBought = async (item) => {
    const user = auth.currentUser;
    if (!user) return;
    await markAsBought(user.uid, item, item.price);
  };

  // added: create a collection in Firebase (the listener above refreshes the UI)
  const handleCreateCollection = async (collection) => {
    const user = auth.currentUser;
    if (!user) return;
    await addCollection(user.uid, collection);
  };

  // added: delete collections. Items inside are kept, but their collection is cleared.
  const handleDeleteCollections = async (ids) => {
    const user = auth.currentUser;
    if (!user) return;
    const names = collections.filter((c) => ids.includes(c.id)).map((c) => c.name);
    await deleteCollections(user.uid, ids, names);
  };

  // added: save the display name to users/{uid}. The screen updates instantly, but the database
  // write waits 600 ms after the last keystroke so typing a name is not one write per letter.
  const nameTimer = useRef(null);
  const handleNameChange = (name) => {
    setUserName(name);
    clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => {
      const user = auth.currentUser;
      if (user && name.trim()) updateUser(user.uid, name.trim()).catch(console.error);
    }, 600);
  };
  useEffect(() => () => clearTimeout(nameTimer.current), []);

  // added: any settings change is applied on screen at once and saved to users/{uid}/settings
  // Notification preferences are validated first: null / undefined / wrong types are rejected and nothing is changed.
  // Returns "" when saved, otherwise the error message (Settings.jsx shows it).
  const handleSettings = async (patch) => {
    const touchesNotifications = NOTIFICATION_KEYS.some((k) => patch && Object.prototype.hasOwnProperty.call(patch, k));
    if (touchesNotifications) {
      const problem = validateNotificationPatch(patch);
      if (problem) return problem;
    }

    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, settings[k]]));
    setSettings((prev) => ({ ...prev, ...patch }));

    const user = auth.currentUser;
    if (!user) return "";
    try {
      await saveSettings(user.uid, patch);
      return "";
    } catch (error) {
      console.error(error);
      setSettings((prev) => ({ ...prev, ...before }));   // put the old values back
      return touchesNotifications ? MESSAGES.notifications.failed : error.message;
    }
  };

  // added: delete the profile record + the auth account. App.jsx notices the logout and shows the landing page.
  // Returns an error message (or "") so the Settings modal can show it.
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      onDeleteAccount?.();
      return "";
    } catch (error) {
      // Firebase refuses this if the login is old
      return error.code === "auth/requires-recent-login"
        ? "For your security, please log out, log in again, then retry deleting your account."
        : error.message;
    }
  };

  // added: log out. The auth listener in App.jsx takes the user back to the landing page.
  const handleLogout = () => logout().catch(console.error);

  // added: notifications come from the user's real items; the unread count compares them with the saved read time
  const notifications = buildNotifications(items);
  const unread = settings.inApp ? notifications.filter((n) => n.at > (settings.notifReadAt || 0)).length : 0;

  // (moved below the handlers it uses)
  const tools = (
      <div className="db-top__tools">
        {/* changed: the search button now opens the Watchlist, which has the search box */}
        <button type="button" className="db-iconbtn" aria-label="Search" onClick={() => setActive("Watchlist")}>
          <Icon><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>
        </button>
        <button type="button" className="db-iconbtn" aria-label="Notifications" aria-expanded={notifOpen} onClick={() => setNotifOpen(!notifOpen)}>
          <Icon><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></Icon>
          {unread > 0 && <span className="db-badge" aria-label={`${unread} unread`}>{unread > 9 ? "9+" : unread}</span>}
        </button>
        {notifOpen && (
          <Notifications
            notifications={notifications}
            readAt={settings.notifReadAt || 0}
            enabled={settings.inApp}
            onMarkRead={() => handleSettings({ notifReadAt: Date.now() })}
            onClose={() => setNotifOpen(false)}
          />
        )}
        <span className="db-avatar" aria-label={userName}>{initials}</span>
      </div>
  );


  return (
    <div className="db-app">
      {/* ---------- Sidebar ---------- */}
      <aside className="db-side">
        <img className="db-side__logo" src={logo} alt="PeekyFox" />

        <p className="db-side__group">Workspace</p>
        <nav aria-label="Workspace">
          {NAV.map((n) => (
            <button key={n.label} type="button"
              className={`db-nav${active === n.label ? " is-active" : ""}`}
              aria-current={active === n.label ? "page" : undefined}
              onClick={() => setActive(n.label)}>
              <Icon>{n.icon}</Icon>{n.label}
            </button>
          ))}
        </nav>

        <p className="db-side__group">Preferences</p>
        <button type="button" className={`db-nav${active === "Settings" ? " is-active" : ""}`} aria-current={active === "Settings" ? "page" : undefined} onClick={() => setActive("Settings")}>
          <Icon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>
          Settings
        </button>

        {/* added: log out button (Firebase signOut) */}
        <button type="button" className="db-nav db-nav--logout" onClick={handleLogout}>
          <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></Icon>
          Log out
        </button>

        <div className="db-tip">
          <img className="db-tip__fox" src={mascot} alt="" />
          <p>Pixie tip: Set a target price and I will cheer when it drops.</p>
        </div>
        <p className="db-side__foot">A little patience. A better price.</p>
      </aside>

      {/* ---------- Main ---------- */}
      <main className="db-main">
        {active === "Watchlist" ? (

          // firebase added
          <Watchlist
            items={items}
            collections={collectionNames}
            openId={focusId}
            onOpened={() => setFocusId(null)}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItems}
            onBought={handleBought}
            onAdd={() => openAdd()}
          />
        ) : active === "Bought and Savings" ? (
          <BoughtSavings purchases={purchases} tools={tools} />
        ) : active === "Settings" ? (
          <Settings
            userName={userName}
            onNameChange={handleNameChange}
            settings={settings}
            onSettings={handleSettings}
            items={items}
            onDeleteAccount={handleDeleteAccount}
            onLogout={handleLogout}
          />
        ) : active === "Collection" ? (
          <Collection
            items={items}
            collections={collections}
            onAddItem={() => openAdd()}
            onCreate={handleCreateCollection}
            onDelete={handleDeleteCollections}
            onViewItem={(id) => { setFocusId(id); setActive("Watchlist"); }}
          />
        ) : (
          <>
          <header className="db-top">
            <img className="db-top__fox" src={mascot} alt="Pixie" />
            <div className="db-top__text">
              <h1>Welcome back, {userName}!</h1>
              <p>What product do you want to track today?</p>
            </div>
            {tools}
          </header>

          {items.length > 0 ? (
            <DashboardHome
              items={items}
              purchases={purchases}
              collections={collectionSummaries}
              onQuickAdd={openAdd}
              onViewItem={(id) => { setFocusId(id); setActive("Watchlist"); }}
            />
          ) : (
            <section className="db-empty" aria-labelledby="db-empty-title">
              <img className="db-empty__fox" src={sleep} alt="Pixie sleeping" />
              <h2 id="db-empty-title">It's quiet in here.</h2>
              <p>Paste your first link to start tracking prices.</p>
              <button type="button" className="db-add" onClick={() => openAdd()}>+ Add your first item</button>
            </section>
          )}
          </>
        )}
      </main>

      {/* added: on phones/tablets the sidebar is hidden, so this bottom bar is the navigation.
          Hidden on wide screens by Dashboard.css. */}
      <nav className="db-tabbar" aria-label="Main">
        {[...NAV, { label: "Settings", icon: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></> }].map((n) => (
          <button key={n.label} type="button" className={active === n.label ? "is-active" : ""}
            aria-current={active === n.label ? "page" : undefined} onClick={() => setActive(n.label)}>
            <Icon>{n.icon}</Icon>
            <span>{n.label === "Bought and Savings" ? "Savings" : n.label}</span>
          </button>
        ))}
      </nav>

      {addOpen && (
        <AddItemModal
          key={quickUrl || "new"}
          initialUrl={quickUrl}
          collections={collectionNames}
          watchlistCount={items.length}
          defaultStockThreshold={settings.stockThreshold}
          onClose={() => setAddOpen(false)}
          
          // operational add item fixed(reeal)
          onSave={async (item) => {
            await handleAddItem({
              image: null,
              alert: true,
              ...item
            });
          }}
        />
      )}

      {/* ---------- Onboarding modal ---------- */}
      {open && (
        <div className="db-overlay" role="presentation">
          <div className="db-modal" role="dialog" aria-modal="true" aria-label="Meet Pixie">
            <button type="button" className="db-modal__close" aria-label="Close" onClick={() => setOpen(false)}>×</button>

            <ol className="db-steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((_, i) => (
                <li key={i} className={`db-step${i === step ? " is-current" : i < step ? " is-done" : ""}`}>{i + 1}</li>
              ))}
            </ol>

            <div className="db-modal__body">
              <div className="db-modal__stage">
                <img key={step} src={STEPS[step].image} alt={STEPS[step].alt} />
                <span className="db-modal__shadow" />
              </div>
              <div className="db-modal__copy">
                <h2>{STEPS[step].title}</h2>
                <p>{STEPS[step].text}</p>
              </div>
            </div>

            <button type="button" className="db-next" onClick={next}>{isLast ? "Get started" : "Next"}</button>
          </div>
        </div>
      )}
    </div>
  );
}