/* Quest Digital — homepage.  SHARED BASE.
   Helpers (scroll-reveal, scrolled header, lucide icon), the fixed header and
   the footer. Consumes the design-system bundle; loaded as text/babel.
   Everything other files need is exported to window at the bottom. */

const NS = window.QuestMedicalDesignSystem_1bd691;
const { Button } = NS;

const A = "../../assets";
const TEAL = "var(--division-digital)";   /* #2ab3c0 */
const TEAL_HEX = "#2ab3c0";
const INK = "#0e2440";    /* editorial navy — dark sections        */
const INK2 = "#15304f";   /* lifted navy — cards / panels on dark   */
const INK3 = "#0a1c33";   /* deepest navy — header scrim / footer   */

/* ── Scroll-reveal: fade + rise once, respects reduced-motion ── */
function useReveal() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = () => { el.style.opacity = 1; el.style.transform = "none"; };
    if (reduce) { show(); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { show(); obs.disconnect(); }
    }, { threshold: 0.12 });
    obs.observe(el);
    const t = setTimeout(() => { show(); obs.disconnect(); }, 1000); /* capture safety */
    return () => { obs.disconnect(); clearTimeout(t); };
  }, []);
  return ref;
}
function Reveal({ children, delay = 0, y = 26, style = {}, ...rest }) {
  const ref = useReveal();
  return (
    <div ref={ref} style={{ opacity: 0, transform: `translateY(${y}px)`, transition: `opacity 0.7s var(--ease) ${delay}s, transform 0.7s var(--ease) ${delay}s`, ...style }} {...rest}>
      {children}
    </div>
  );
}

/* ── Header solidifies after a little scroll ── */
function useScrolled(threshold = 40) {
  const [s, setS] = React.useState(false);
  React.useEffect(() => {
    const on = () => setS(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return s;
}

/* ── Lucide icon (rendered via data-lucide; createIcons() runs in App) ── */
function Icon({ name, size = 22, color = "currentColor", style = {} }) {
  return <i data-lucide={name} style={{ width: size, height: size, display: "inline-flex", color, ...style }}></i>;
}

/* ── Brand social marks (Lucide dropped these; inline single-path SVGs) ── */
const SOCIAL_PATHS = {
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
};
function SocialIcon({ name, size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: "block" }}>
      <path d={SOCIAL_PATHS[name]}></path>
    </svg>
  );
}

/* ── Eyebrow: teal rule + tracked uppercase label ── */
function Eyebrow({ children, onDark = false, style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "14px", ...style }}>
      <span style={{ width: "30px", height: "2px", background: TEAL }}></span>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: onDark ? "rgba(255,255,255,0.78)" : TEAL }}>{children}</span>
    </div>
  );
}

/* ── Brand lockup: Quest wordmark · Digital ── */
function Logo({ height = 30 }) {
  return (
    <a href="home.html" style={{ display: "flex", alignItems: "center", gap: "13px", textDecoration: "none" }}>
      <img src={`${A}/logos/quest-primary-white.png`} alt="Quest" style={{ height: `${height}px`, width: "auto", display: "block" }} />
      <span style={{ height: "18px", width: "1px", background: "rgba(255,255,255,0.32)" }}></span>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: TEAL_HEX }}>Digital</span>
    </a>
  );
}

/* ── Services mega-dropdown content ── */
const SERVICES_MENU = [
  { n: "01", icon: "code-2",     title: "Web, Software & Apps",        desc: "Bespoke enterprise platforms and fast Next.js sites with booking & portals built in.", href: "service-web.html" },
  { n: "02", icon: "server",     title: "Hosting & Managed Services",  desc: "We own the uptime, security, maintenance and support. Everything under one roof.",       href: "service-hosting.html" },
  { n: "03", icon: "trending-up",title: "Marketing & Growth",          desc: "Performance-led SEO, paid media, social and email that turn visitors into enquiries.",  href: "service-marketing.html" },
  { n: "04", icon: "palette",    title: "Brand & Design",              desc: "Logo, brand guidelines, print and collateral — so it looks as good as it works.",        href: "service-brand.html" },
];

function ServicesMenu({ open }) {
  return (
    <div role="menu" aria-hidden={!open}
      style={{
        position: "absolute", top: "calc(100% + 18px)", right: 0, width: "760px",
        display: "grid", gridTemplateColumns: "1fr 250px",
        background: INK2, border: "1px solid rgba(255,255,255,0.10)", borderRadius: "18px",
        boxShadow: "0 30px 70px -30px rgba(0,0,0,0.85)", overflow: "hidden",
        opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden",
        transform: open ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.2s var(--ease), transform 0.2s var(--ease), visibility 0.2s var(--ease)",
      }}>
      <span style={{ position: "absolute", top: "-7px", right: "120px", width: "14px", height: "14px", background: INK2, borderLeft: "1px solid rgba(255,255,255,0.10)", borderTop: "1px solid rgba(255,255,255,0.10)", transform: "rotate(45deg)" }}></span>
      <div style={{ padding: "22px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        {SERVICES_MENU.map((s) => (
          <a key={s.n} href={s.href} role="menuitem"
            style={{ display: "block", padding: "16px", borderRadius: "14px", textDecoration: "none", transition: "background var(--dur) var(--ease)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "11px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "12px", background: "rgba(42,179,192,0.12)", border: "1px solid rgba(42,179,192,0.28)", color: TEAL_HEX }}>
                <Icon name={s.icon} size={21} />
              </span>
              <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: TEAL_HEX }}>{s.n}</span>
            </div>
            <div style={{ fontSize: "16px", fontWeight: 500, color: "#fff", marginBottom: "6px" }}>{s.title}</div>
            <div style={{ fontSize: "13px", fontWeight: 300, lineHeight: 1.55, color: "rgba(255,255,255,0.62)" }}>{s.desc}</div>
          </a>
        ))}
      </div>
      <div style={{ background: "linear-gradient(180deg,#173a5f,#10294a)", padding: "26px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "14px" }}>Not sure where to start?</div>
        <h4 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>One partner, brand to build to hosted.</h4>
        <p style={{ margin: "0 0 22px", fontSize: "14px", fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.74)" }}>Tell us what you&rsquo;re trying to do and we&rsquo;ll point you to the right team.</p>
        <a href="contact.html" style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: INK, background: TEAL, padding: "13px 18px", borderRadius: "999px", textDecoration: "none" }}>
          Talk to our team <Icon name="arrow-right" size={15} />
        </a>
      </div>
    </div>
  );
}

/* ── Fixed header ── */
function Header() {
  const scrolled = useScrolled(40);
  const NAV = [["Services","services.html"],["Work","work.html"],["About","about.html"],["Contact","contact.html"]];
  const curPage = window.location.pathname.split('/').pop();
  const [svcOpen, setSvcOpen] = React.useState(false);
  const closeTimer = React.useRef(null);
  const openMenu = () => { clearTimeout(closeTimer.current); setSvcOpen(true); };
  const closeMenu = () => { closeTimer.current = setTimeout(() => setSvcOpen(false), 120); };
  React.useEffect(() => () => clearTimeout(closeTimer.current), []);
  React.useEffect(() => { lucide && lucide.createIcons(); }, [svcOpen]);
  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 60,
      background: (scrolled || svcOpen) ? "rgba(10,28,51,0.96)" : "transparent",
      borderBottom: `1px solid ${(scrolled || svcOpen) ? "rgba(255,255,255,0.08)" : "transparent"}`,
      transition: "background 0.35s var(--ease), border-color 0.35s var(--ease)",
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo />
        <nav style={{ display: "flex", alignItems: "center", gap: "34px" }}>
          {NAV.map(([label, href]) => {
            const active = curPage === href || (label === "Services" && curPage.startsWith("service"));
            if (label === "Services") {
              const lit = active || svcOpen;
              return (
                <span key={label} style={{ position: "relative" }}
                  onMouseEnter={openMenu} onMouseLeave={closeMenu}>
                  <a href={href}
                    aria-haspopup="true" aria-expanded={svcOpen}
                    onFocus={openMenu}
                    onKeyDown={(e) => { if (e.key === "Escape") setSvcOpen(false); }}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "15px", fontWeight: 500, color: lit ? "#fff" : "rgba(255,255,255,0.82)", textDecoration: "none", transition: "color var(--dur) var(--ease)", paddingBottom: "3px", borderBottom: lit ? `2px solid ${TEAL_HEX}` : "2px solid transparent" }}>
                    {label}
                    <Icon name="chevron-down" size={15} style={{ transition: "transform 0.25s var(--ease)", transform: svcOpen ? "rotate(180deg)" : "none" }} />
                  </a>
                  <ServicesMenu open={svcOpen} />
                </span>
              );
            }
            return (
              <a key={label} href={href}
                style={{ fontSize: "15px", fontWeight: 500, color: active ? "#fff" : "rgba(255,255,255,0.82)", textDecoration: "none", transition: "color var(--dur) var(--ease)", paddingBottom: "3px", borderBottom: active ? `2px solid ${TEAL_HEX}` : "2px solid transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.82)"; }}>{label}</a>
            );
          })}
          <a href="contact.html" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 600, color: INK, background: TEAL, padding: "11px 22px", borderRadius: "999px", textDecoration: "none", transition: "transform var(--dur) var(--ease)" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
            Start a project
          </a>
        </nav>
      </div>
    </header>
  );
}

/* ── Footer ── */
function Footer() {
  const cols = [
    { h: "Services", links: [{l:"Web, Software and Apps",h:"service-web.html"},{l:"Hosting and Managed Services",h:"service-hosting.html"},{l:"Marketing and Growth",h:"service-marketing.html"},{l:"Brand and Design",h:"service-brand.html"}] },
    { h: "Company", links: [{l:"About",h:"about.html"},{l:"Work",h:"work.html"},{l:"Contact",h:"contact.html"},{l:"Privacy Policy",h:"#"}] },
  ];
  const socials = [
    { name: "linkedin", href: "#" },
    { name: "instagram", href: "#" },
    { name: "facebook", href: "#" },
  ];
  return (
    <footer style={{ background: INK3, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "84px 40px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1.2fr", gap: "48px", paddingBottom: "64px" }}>
          {/* brand column */}
          <div>
            <Logo height={30} />
            <p style={{ margin: "26px 0 0", fontSize: "15px", fontWeight: 300, lineHeight: 1.7, color: "rgba(255,255,255,0.68)", maxWidth: "300px" }}>
              The creative and technology studio of Quest Group. Based in Essex, working across the UK and internationally.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", marginTop: "22px", padding: "8px 14px", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "999px" }}>
              <Icon name="shield-check" size={16} color={TEAL_HEX} />
              <span style={{ fontSize: "12.5px", fontWeight: 500, letterSpacing: "0.04em", color: "rgba(255,255,255,0.85)" }}>ISO 27001 certified</span>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <h4 style={{ margin: "0 0 20px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{c.h}</h4>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "13px" }}>
                {c.links.map((l) => (
                  <li key={l.l}><a href={l.h} style={{ fontSize: "15px", fontWeight: 300, color: "rgba(255,255,255,0.78)", textDecoration: "none", transition: "color var(--dur) var(--ease)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = TEAL_HEX)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.78)")}>{l.l}</a></li>
                ))}
              </ul>
            </div>
          ))}
          {/* get in touch */}
          <div>
            <h4 style={{ margin: "0 0 20px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>Get in touch</h4>
            <a href="mailto:hello@questdesign.co.uk" style={{ display: "block", fontSize: "16px", fontWeight: 500, color: "#fff", textDecoration: "none", marginBottom: "10px" }}>hello@questdesign.co.uk</a>
            <a href="tel:+441234000000" style={{ display: "block", fontSize: "15px", fontWeight: 300, color: "rgba(255,255,255,0.78)", textDecoration: "none", marginBottom: "24px" }}>01234 000000</a>
            <div style={{ display: "flex", gap: "10px" }}>
              {socials.map((s) => (
                <a key={s.name} href={s.href} aria-label={s.name} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)", transition: "background var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = TEAL_HEX; e.currentTarget.style.color = INK; e.currentTarget.style.borderColor = TEAL_HEX; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}>
                  <SocialIcon name={s.name} size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "26px 0 34px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Quest Digital is a trading name of Quest Group. Registered in England and Wales.</p>
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>© 2026 Quest Group · All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  NS, Button, A, TEAL, TEAL_HEX, INK, INK2, INK3,
  useReveal, Reveal, useScrolled, Icon, Eyebrow, Logo, Header, Footer,
});
