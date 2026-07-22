/* Quest Digital — Work page sections */
const { A, TEAL, TEAL_HEX, INK, INK2, INK3, Reveal, Icon, Eyebrow, Header, Footer } = window;

const CASES = [
  { img: `${A}/images/healthcare.jpg`, sector: "Healthcare", service: "web", track: "enterprise",
    title: "Patient booking portal", desc: "Replaced a stack of spreadsheets with a self-service booking and patient management system that cut admin time significantly." },
  { img: `${A}/images/asset-management.jpg`, sector: "Logistics", service: "web", track: "enterprise",
    title: "Fleet live dashboard", desc: "Real-time tracking dashboard giving an entire delivery operation full visibility — location, jobs and status in one view." },
  { img: `${A}/images/partnership.jpg`, sector: "Professional Services", service: "web", track: "small",
    title: "Marketing site and CMS", desc: "Fast, lightweight Next.js site the team can edit and run themselves, replacing a slow, plugin-heavy WordPress setup." },
  { img: `${A}/images/mobile-ct.jpg`, sector: "Healthcare", service: "web", track: "enterprise",
    title: "Mobile diagnostics platform", desc: "Specialist booking and information platform for mobile CT and MRI diagnostic services across multiple sites." },
  { img: `${A}/images/hero-units.jpg`, sector: "Manufacturing", service: "brand", track: "small",
    title: "Brand refresh and web", desc: "Updated visual identity and matching digital presence for a specialist manufacturer entering new markets." },
  { img: `${A}/images/news-seacrown.jpg`, sector: "Hospitality", service: "web", track: "small",
    title: "Online booking system", desc: "Custom booking and ordering system that replaced a complex multi-plugin WordPress setup with something clean and fast." },
];

const FILTERS = [
  { key: "all", label: "All work" },
  { key: "web", label: "Web and software" },
  { key: "brand", label: "Brand" },
  { key: "enterprise", label: "Enterprise" },
  { key: "small", label: "Small business" },
];

function WorkCard({ img, sector, service, title, desc }) {
  const [h, setH] = React.useState(false);
  return (
    <a href="#" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "block", textDecoration: "none", borderRadius: "18px", overflow: "hidden", border: `1px solid ${h ? TEAL_HEX : "var(--quest-border)"}`, background: "#fff", transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)", boxShadow: h ? "0 18px 40px rgba(33,75,127,0.13)" : "none" }}>
      <div style={{ overflow: "hidden", aspectRatio: "16/10", background: INK }}>
        <img src={img} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", transform: h ? "scale(1.05)" : "scale(1)", transition: "transform 0.6s var(--ease)" }} />
      </div>
      <div style={{ padding: "24px 26px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL_HEX }}>{sector}</span>
          <span style={{ color: TEAL_HEX, opacity: h ? 1 : 0, transform: h ? "translate(0,0)" : "translate(-4px,4px)", transition: "all 0.4s var(--ease)" }}><Icon name="arrow-up-right" size={16} /></span>
        </div>
        <h3 style={{ margin: "0 0 9px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2, color: h ? TEAL_HEX : "var(--quest-heading)", transition: "color var(--dur) var(--ease)" }}>{title}</h3>
        <p style={{ margin: 0, fontSize: "14.5px", fontWeight: 300, lineHeight: 1.55, color: "var(--quest-body)" }}>{desc}</p>
      </div>
    </a>
  );
}

function WorkHero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff", paddingTop: "160px", paddingBottom: "100px" }}>
      <div style={{ position: "absolute", top: "-30%", left: "-10%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(43,123,185,0.22) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "26px" }}>Selected work</Eyebrow>
          <h1 style={{ margin: "0 0 22px", fontWeight: 700, fontSize: "clamp(44px, 6vw, 82px)", letterSpacing: "-0.025em", lineHeight: 1.0 }}>What we&rsquo;ve built.</h1>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.82)", maxWidth: "520px" }}>
            From enterprise platforms to small business websites. A selection of projects across different sectors and scales.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function WorkGrid() {
  const [filter, setFilter] = React.useState("all");
  const visible = CASES.filter((c) => filter === "all" || c.service === filter || c.track === filter);
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "80px 40px 100px" }}>
        {/* filter tabs */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "56px" }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ fontSize: "14px", fontWeight: active ? 700 : 500, color: active ? "#fff" : "var(--quest-body)", background: active ? INK : "transparent", border: `1.5px solid ${active ? INK : "var(--quest-border)"}`, padding: "10px 20px", borderRadius: "999px", cursor: "pointer", transition: "all var(--dur) var(--ease)" }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = INK; e.currentTarget.style.color = INK; }}}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = "var(--quest-border)"; e.currentTarget.style.color = "var(--quest-body)"; }}}>{f.label}</button>
            );
          })}
        </div>
        {/* grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {visible.map((c, i) => (
            <Reveal key={c.title} delay={(i % 3) * 0.05}>
              <WorkCard {...c} />
            </Reveal>
          ))}
        </div>
        {visible.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--quest-body)", fontSize: "17px", fontWeight: 300 }}>
            No projects in this filter yet. <a href="contact.html" style={{ color: TEAL_HEX }}>Working on something similar?</a>
          </div>
        )}
      </div>
    </section>
  );
}

function WorkCTA() {
  return (
    <section style={{ background: INK, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
        <Reveal>
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(28px, 3.4vw, 46px)", fontWeight: 700, letterSpacing: "-0.02em" }}>Working on something?</h2>
          <p style={{ margin: 0, fontSize: "18px", fontWeight: 300, color: "rgba(255,255,255,0.78)" }}>We&rsquo;d love to hear about it.</p>
        </Reveal>
        <Reveal delay={0.1}>
          <a href="contact.html" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 600, color: INK, background: TEAL_HEX, padding: "18px 32px", borderRadius: "999px", textDecoration: "none", whiteSpace: "nowrap", transition: "transform var(--dur) var(--ease)" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
            Start a conversation <Icon name="arrow-right" size={18} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function App() {
  React.useEffect(() => {
    const draw = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };
    draw(); const t = setTimeout(draw, 300); return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <Header />
      <WorkHero />
      <WorkGrid />
      <WorkCTA />
      <Footer />
    </div>
  );
}
window.App = App;
