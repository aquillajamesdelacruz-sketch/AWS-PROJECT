import { useState } from "react";
import "./LandingPage.css";
import logo from "./assets/logo.png";
import mascot from "./assets/mascot.png";

const NAV_ITEMS = ["Home", "Features", "About Us", "Contact Us"];

export default function LandingPage({ onSignUp, onStartTracking }) {
  const [active, setActive] = useState("Home");

  return (
    <div className="pf-frame">
      <section className="pf-hero">
        <header className="pf-header">
          <a className="pf-logo" href="#home" aria-label="PeekyFox home">
            <img src={logo} alt="PeekyFox" />
          </a>

          <nav className="pf-nav" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                className={`pf-nav__item${active === item ? " is-active" : ""}`}
                aria-current={active === item ? "page" : undefined}
                onClick={() => setActive(item)}
              >
                {item}
              </button>
            ))}
          </nav>

          <button type="button" className="pf-signup" onClick={onSignUp}>Sign Up</button>
        </header>

        <h1 className="pf-wordmark" aria-label="PeekyFox">
          <span className="pf-wordmark__peeky">Peeky</span>
          <span className="pf-wordmark__fox">Fox</span>
        </h1>

        <div className="pf-copy">
          <h2 className="pf-tagline">
            Unleash the
            <span className="pf-tagline__accent">Smartest Version</span>
            of your shopping
          </h2>
          <button type="button" className="pf-cta" onClick={onStartTracking}>Start Tracking</button>
        </div>

        <img className="pf-mascot" src={mascot} alt="PeekyFox mascot waving" />
      </section>
    </div>
  );
}