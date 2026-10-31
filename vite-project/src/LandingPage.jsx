import { useEffect, useState } from "react";
import "./LandingPage.css";
import logo from "./assets/logo.png";
import mascot from "./assets/mascot.png";
import seal from "./assets/bulsu.png";

const NAV_ITEMS = [
  { label: "Home", id: "home" },
  { label: "Features", id: "features" },
  { label: "About Us", id: "about" },
  { label: "Contact Us", id: "contact" },
];

/* ---------- Icons (inline SVG, inherit currentColor) ---------- */
const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const EyeIcon = () => (
  <Icon><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Icon>
);
const LayersIcon = () => (
  <Icon><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></Icon>
);
const BagIcon = () => (
  <Icon><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Icon>
);
const MailIcon = () => (
  <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Icon>
);
const PhoneIcon = () => (
  <Icon><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></Icon>
);

const TrendThumb = ({ direction }) => (
  <span className={`pf-notif__thumb pf-notif__thumb--${direction}`} aria-hidden="true">
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" strokeWidth="3"
         strokeLinecap="round" strokeLinejoin="round">
      {direction === "down" ? (
        <><polyline points="4,8 13,17 18,12 27,23" /><polyline points="20,23 27,23 27,16" /></>
      ) : (
        <><polyline points="4,24 13,15 18,20 27,9" /><polyline points="20,9 27,9 27,16" /></>
      )}
    </svg>
  </span>
);

const FEATURES = [
  { title: "Smart Watchlist", text: "Get instant alerts when your favorite items go on sale.", Icon: EyeIcon },
  { title: "Price History", text: "See the price trends of any product over time.", Icon: LayersIcon },
  { title: "Savings Tracker", text: "Keep track of how much you've saved this month.", Icon: BagIcon },
];

export default function LandingPage({ onSignUp, onStartTracking }) {
  const [active, setActive] = useState("home");

  // Highlight the nav link of the section currently in view
  useEffect(() => {
    const sections = NAV_ITEMS.map(({ id }) => document.getElementById(id)).filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="pf-page">
      <div className="pf-frame">
        <div className="pf-peach">
          {/* ---------- Hero ---------- */}
          <section className="pf-hero" id="home">
            <header className="pf-header">
              <a className="pf-logo" href="#home" aria-label="PeekyFox home">
                <img src={logo} alt="PeekyFox" />
              </a>

              <nav className="pf-nav" aria-label="Main">
                {NAV_ITEMS.map(({ label, id }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={`pf-nav__item${active === id ? " is-active" : ""}`}
                    aria-current={active === id ? "true" : undefined}
                  >
                    {label}
                  </a>
                ))}
              </nav>

              <button type="button" className="pf-btn pf-signup" onClick={onSignUp}>Sign Up</button>
            </header>

            <h1 className="pf-wordmark" aria-label="PeekyFox">
              <span className="pf-wordmark__peeky" aria-hidden="true">Peeky</span>
              <span className="pf-wordmark__fox" aria-hidden="true">Fox</span>
            </h1>

            <div className="pf-copy">
              <h2 className="pf-tagline">
                Unleash the
                <span className="pf-tagline__accent">Smartest Version</span>
                of your shopping
              </h2>
              <button type="button" className="pf-btn pf-cta" onClick={onStartTracking}>Start Tracking</button>
            </div>

            <img className="pf-mascot" src={mascot} alt="PeekyFox mascot waving" />

            <div className="pf-notif pf-notif--drop" aria-hidden="true">
              <img className="pf-notif__fox" src={mascot} alt="" />
              <TrendThumb direction="down" />
              <span>Product Price Drop!</span>
            </div>
            <div className="pf-notif pf-notif--rise" aria-hidden="true">
              <span>Product Price Increased!</span>
              <TrendThumb direction="up" />
              <img className="pf-notif__fox" src={mascot} alt="" />
            </div>
          </section>

          {/* ---------- Features ---------- */}
          <section className="pf-features" id="features">
            <p className="pf-eyebrow">Features</p>
            <h2 className="pf-heading">Everything you need to track</h2>

            <div className="pf-features__grid">
              {FEATURES.map(({ title, text, Icon: FeatureIcon }) => (
                <article className="pf-feature" key={title}>
                  <span className="pf-feature__icon"><FeatureIcon /></span>
                  <h3 className="pf-feature__title">{title}</h3>
                  <p className="pf-feature__text">{text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ---------- About ---------- */}
          <section className="pf-about" id="about">
            <div className="pf-about__inner">
              <div className="pf-about__text">
                <h2 className="pf-heading pf-heading--left">About Us</h2>
                <p>
                  PeekyFox is built by a group of students from Bulacan State University,
                  aiming to make smart shopping easier by helping people track prices,
                  spot deals, and save money without endless browsing.
                </p>
              </div>

              <div className="pf-about__visual">
                <img className="pf-about__seal" src={seal} alt="Bulacan State University seal" />
                <img className="pf-about__mascot" src={mascot} alt="PeekyFox mascot" />
              </div>
            </div>
          </section>
        </div>

        {/* ---------- Contact ---------- */}
        <section className="pf-contact" id="contact">
          <p className="pf-eyebrow">Contact Us</p>
          <h2 className="pf-heading">Get in touch with us!</h2>

          <div className="pf-contact__card">
            <h3 className="pf-contact__title">Contact Details</h3>
            <p className="pf-contact__lead">We'd love to hear from you. Reach out to our team directly.</p>

            <div className="pf-contact__row">
              <span className="pf-contact__icon"><MailIcon /></span>
              <div>
                <span className="pf-contact__label">Email Address</span>
                <a className="pf-contact__value" href="mailto:peekyfox@contact.com">peekyfox@contact.com</a>
              </div>
            </div>

            <div className="pf-contact__row">
              <span className="pf-contact__icon"><PhoneIcon /></span>
              <div>
                <span className="pf-contact__label">Phone Number</span>
                <span className="pf-contact__value">+63 (000) 000-0000</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Footer ---------- */}
        <footer className="pf-footer">
          <div className="pf-footer__grid">
            <a className="pf-logo pf-footer__logo" href="#home" aria-label="PeekyFox home">
              <img src={logo} alt="PeekyFox" />
            </a>

            <nav className="pf-footer__nav" aria-label="Footer">
              {NAV_ITEMS.map(({ label, id }) => (
                <a key={id} href={`#${id}`}>{label}</a>
              ))}
            </nav>

            <div className="pf-footer__contact">
              <h3>Contact Us</h3>
              <p><MailIcon /> peekyfox@contact.com</p>
              <p><PhoneIcon /> +63 (000) 000-0000</p>
            </div>

            <div className="pf-footer__cta">
              <h3>Ready to start tracking?</h3>
              <p>PeekyFox helps shoppers save time, spot better deals, and keep every price move in one place.</p>
              <button type="button" className="pf-btn pf-cta" onClick={onStartTracking}>Start Tracking</button>
            </div>
          </div>

          <p className="pf-footer__copy">
            © {new Date().getFullYear()} PeekyFox. Built by students from Bulacan State University.
          </p>
        </footer>
      </div>
    </div>
  );
}