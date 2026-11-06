import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageHead from "../component/PageHead.jsx";
import logo from "../assets/Logo.png";
import mascot from "../assets/Mascot.png";
import seal from "../assets/bulsu.png";
import cict from "../assets/CICT_LOGO.png";
import findFox from "../assets/find.png";
import peekFox from "../assets/peek.png";
import upFox from "../assets/up.png";
import downFox from "../assets/down.png";

const navigation = [["Home", "home"], ["Features", "features"], ["About us", "about"], ["Contact", "contact"]];
function Icon({ kind }) {
  const paths = {
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    chart: <><path d="M4 4v16h16" /><path d="m7 14 4-5 4 3 5-7" /></>,
    collection: <><rect x="3" y="4" width="7" height="7" rx="2" /><rect x="14" y="4" width="7" height="7" rx="2" /><rect x="3" y="15" width="18" height="6" rx="2" /></>,
    arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

export default function LandingPage() {
  const page = useRef(null);
  const [active, setActive] = useState("home");
  const [motionPaused, setMotionPaused] = useState(false);
  useEffect(() => {
    const sections = [...page.current.querySelectorAll("section[id]")];
    const nav = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); }), { rootMargin: "-15% 0px -50% 0px" });
    sections.forEach((section) => nav.observe(section));
    const reveals = [...page.current.querySelectorAll(".pf-reveal")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const entrance = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); entrance.unobserve(entry.target); }
    }), { threshold: .12 });
    if (!reducedMotion.matches) reveals.forEach((element) => { element.classList.add("will-reveal"); entrance.observe(element); });
    const showAll = () => reveals.forEach((element) => element.classList.remove("will-reveal"));
    reducedMotion.addEventListener("change", showAll);
    return () => { nav.disconnect(); entrance.disconnect(); reducedMotion.removeEventListener("change", showAll); };
  }, []);

  return (
    <>
      <PageHead title="PeekyFox" description="PeekyFox helps you track prices on Shopee, Lazada, Amazon and TikTok Shop, set target prices, and get alerted when the price drops. A little patience. A better price." />
      <div className={`pf-page${motionPaused ? " pf-motion-paused" : ""}`} ref={page}>
      <div className="pf-ambient" aria-hidden="true"><i /><i /></div>
      <a className="skip-link" href="#landing-content">Skip to content</a>
      <header className="pf-header">
        <a className="pf-logo" href="#home" aria-label="PeekyFox home"><img src={logo} alt="PeekyFox" /></a>
        <nav className="pf-nav" aria-label="Main navigation">
          {navigation.map(([label, id]) => <a key={id} href={`#${id}`} className={active === id ? "is-active" : ""} aria-current={active === id ? "location" : undefined}>{label}</a>)}
        </nav>
        <Link className="pf-btn pf-btn--small" to="/register">Create account<Icon kind="arrow" /></Link>
      </header>
      <main id="landing-content" tabIndex={-1}>
        <section className="pf-hero" id="home">
          <div className="pf-hero__copy">
            <h1>Good things come<br />to those who <span>track.</span></h1>
            <p>Keep an eye on the things you love. Follow price changes, set your target, and make your next purchase at a better price.</p>
            <div className="pf-hero__actions"><Link className="pf-btn" to="/register">Start tracking<Icon kind="arrow" /></Link><Link className="pf-btn pf-btn--secondary" to="/login">Sign in</Link></div>

          </div>
          <div className="pf-hero__visual" aria-label="Pixie, your price tracking companion">
            <div className="pf-orbit" aria-hidden="true" />

            <img className="pf-mascot" src={mascot} alt="Pixie waving" fetchPriority="high" />
            <div className="pf-alert pf-alert--top"><span className="pf-icon"><Icon kind="eye" /></span><div><strong>Always on your watchlist</strong><span>Keep your favorites in view</span></div></div>
            <div className="pf-alert pf-alert--bottom"><span className="pf-icon pf-icon--green"><Icon kind="bell" /></span><div><strong>A better price, on your terms</strong><span>Set a target. Stay informed.</span></div></div>
          </div>
        </section>
        <section className="pf-features pf-section pf-reveal" id="features">
          <div className="pf-section__heading"><h2>Less checking.<br /><span>More smart shopping.</span></h2><p>One calm place for your wishlist, price changes, and the savings that add up.</p></div>
          <div className="pf-bento">
            <article className="pf-feature pf-feature--watch"><img className="pf-find-fox" src={findFox} width="3750" height="3750" alt="" loading="lazy" />
              <span className="pf-feature__icon"><Icon kind="eye" /></span><h3>Your next purchase,<br />under a watchful eye.</h3><p>Save a product link, choose your target price, and keep track of what happens next.</p>
              <div className="pf-tracking-flow"><span><Icon kind="eye" />Save a product</span><span><Icon kind="bell" />Set your target</span><span><Icon kind="check" />Keep watch</span></div>
            </article>
            <article className="pf-feature pf-feature--history"><span className="pf-feature__icon"><Icon kind="chart" /></span><h3>See the bigger picture.</h3><p>Explore price history to put today's price in perspective.</p><div className="pf-trend-art" aria-hidden="true"><img src={downFox} width="3750" height="3750" alt="" loading="lazy" /><img src={upFox} width="3750" height="3750" alt="" loading="lazy" /></div></article>
            <article className="pf-feature pf-feature--collections"><span className="pf-feature__icon"><Icon kind="collection" /></span><h3>A place for every plan.</h3><p>Group your favorites into collections. Keep your next upgrade or everyday essentials together.</p><div className="pf-tags" aria-hidden="true"><span>Next upgrade</span><span>Everyday essentials</span><span>For later</span></div></article>
            <article className="pf-feature pf-feature--savings"><span className="pf-feature__icon"><Icon kind="check" /></span><div><h3>Small wins. Real savings.</h3><p>Mark items as bought and see how your savings add up over time.</p></div><Link className="pf-text-link" to="/register">Make your first watchlist<Icon kind="arrow" /></Link></article>
          </div>
        </section>
        <section className="pf-about pf-section pf-reveal" id="about"><div className="pf-about__art"><svg className="pf-school-seal" viewBox="104 9 395 393" role="img" aria-label="Bulacan State University seal"><image href={seal} width="605" height="413" /></svg><svg className="pf-school-seal" viewBox="387 172 2973 2961" role="img" aria-label="College of Information and Communications Technology seal"><image href={cict} width="3750" height="3750" /></svg></div><div><h2>Built with a little curiosity.<br />And a lot of care.</h2><p>Created by students from the College of Communications and Information Technology at Bulacan State University. PeekyFox helps you track prices and plan purchases.</p></div></section>
        <section className="pf-contact pf-section pf-reveal" id="contact"><div><h2>A better shopping habit<br />starts with a hello.</h2><p>Have a question or an idea? We'd love to hear from you.</p><a className="pf-text-link" href="mailto:peekyfox@contact.com"><Icon kind="mail" />peekyfox@contact.com</a></div><div className="pf-contact__cta"><img className="pf-peek-fox" src={peekFox} width="553" height="451" alt="" loading="lazy" /><h3>Keep your next find in sight.</h3><Link className="pf-btn" to="/register">Create your watchlist<Icon kind="arrow" /></Link><Link className="pf-text-link" to="/login">Already have an account? Sign in</Link></div></section>
      </main>
      <footer className="pf-footer"><a className="pf-logo" href="#home" aria-label="PeekyFox home"><img src={logo} alt="PeekyFox" loading="lazy" /></a><p>&copy; {new Date().getFullYear()} PeekyFox. Built by students from Bulacan State University.</p><button className="pf-motion-control" type="button" aria-pressed={motionPaused} onClick={() => setMotionPaused(!motionPaused)}>{motionPaused ? "Resume background motion" : "Pause background motion"}</button><Link to="/privacy">Privacy</Link><Link to="/help">Need help?</Link><a href="#home">Back to top<Icon kind="arrow" /></a></footer>
    </div>
    </>
  );
}
