/* Quest Digital — homepage.  CONTENT SECTIONS + App.
   Uses helpers/header/footer exported to window by home-base.jsx.
   Loaded as text/babel after home-base.jsx; exports <App> to window. */

const { Button, A, TEAL, TEAL_HEX, INK, INK2, INK3, Reveal, Icon, Eyebrow, Header, Footer } = window;

/* shared link with sliding arrow */
function ArrowLink({ children, color = TEAL_HEX, dark = false }) {
  const [h, setH] = React.useState(false);
  return (
    <span onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "15px", fontWeight: 600, color: dark ? "#fff" : "var(--quest-heading)", cursor: "pointer" }}>
      {children}
      <span style={{ color, transform: h ? "translateX(6px)" : "translateX(0)", transition: "transform 0.4s var(--ease)" }}>→</span>
    </span>
  );
}

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  return (
    <section id="top" style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center" }}>
      {/* glows */}
      <div style={{ position: "absolute", top: "-28%", right: "-12%", width: "68vw", height: "68vw", background: "radial-gradient(circle, rgba(42,179,192,0.22) 0%, rgba(42,179,192,0) 60%)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-24%", left: "-16%", width: "56vw", height: "56vw", background: "radial-gradient(circle, rgba(43,123,185,0.26) 0%, rgba(43,123,185,0) 62%)", pointerEvents: "none" }}></div>
      {/* faint grid */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.55, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(circle at 52% 42%, #000 28%, transparent 76%)", WebkitMaskImage: "radial-gradient(circle at 52% 42%, #000 28%, transparent 76%)" }}></div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "150px 40px 110px", width: "100%" }}>
        <Reveal y={14}><Eyebrow onDark style={{ marginBottom: "34px" }}>Part of Quest Group</Eyebrow></Reveal>
        <h1 style={{ margin: 0, fontWeight: 700, lineHeight: 1.0, letterSpacing: "-0.025em", fontSize: "clamp(44px, 6.6vw, 92px)", maxWidth: "16ch" }}>
          <Reveal delay={0.08} y={28} style={{ display: "inline" }}>
            <span>We build websites, software and digital products that </span>
            <span style={{ color: TEAL }}>actually work.</span>
          </Reveal>
        </h1>
        <Reveal delay={0.28} style={{ marginTop: "34px", maxWidth: "620px" }}>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.82)" }}>
            From a smart website for your small business to a complex platform for your
            enterprise, we bring the creativity and the technical depth to get it right.
          </p>
        </Reveal>
        <Reveal delay={0.42} style={{ marginTop: "40px" }}>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <a href="#contact" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 600, color: INK, background: TEAL, padding: "17px 30px", borderRadius: "999px", textDecoration: "none", transition: "transform var(--dur) var(--ease)" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
              Got a big idea? Let&rsquo;s talk <Icon name="arrow-right" size={18} />
            </a>
            <a href="#tracks" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 500, color: "#fff", background: "transparent", padding: "16px 28px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.32)", textDecoration: "none", transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.32)"; }}>
              Need a better website? Start here
            </a>
          </div>
        </Reveal>
      </div>
      <div style={{ position: "absolute", bottom: "28px", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.55)", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
        <span>Scroll</span>
        <span style={{ width: "1px", height: "32px", background: "linear-gradient(rgba(255,255,255,0.55), transparent)" }}></span>
      </div>
    </section>
  );
}

/* ───────── Trust band: positioning line + ISO + client logos ───────── */
function Proof() {
  const logos = [
    { src: `${A}/partners/Ramsay.png`, alt: "Ramsay Health Care" },
    { src: `${A}/partners/Healthshare.webp`, alt: "Healthshare" },
  ];
  const placeholders = ["Client", "Client", "Client"];
  return (
    <section style={{ background: "#fff", borderBottom: "1px solid var(--quest-border)" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "50px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "16px", flexWrap: "wrap", marginBottom: "34px" }}>
          <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--quest-body)" }}>
            Trusted by businesses across <strong style={{ fontWeight: 500, color: "var(--quest-heading)" }}>Essex, the UK and beyond</strong>
          </span>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#c5cdd8" }}></span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "14px", fontWeight: 500, color: "var(--quest-heading)" }}>
            <Icon name="shield-check" size={16} color={TEAL_HEX} /> ISO 27001 certified
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(40px, 6vw, 80px)", flexWrap: "wrap" }}>
          {logos.map((l) => (
            <img key={l.alt} src={l.src} alt={l.alt}
              style={{ height: "46px", width: "auto", objectFit: "contain", filter: "grayscale(1)", opacity: 0.6, display: "block", transition: "opacity var(--dur) var(--ease)" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.9)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)} />
          ))}
          {placeholders.map((p, i) => (
            <div key={i} style={{ height: "46px", width: "148px", borderRadius: "8px", border: "1px dashed #d4dae2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#b8c1cc" }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────── Differentiator: creativity × technology ──────────── */
function Difference() {
  const cols = [
    { label: "Creative-only agencies", body: "Great look and feel. But WordPress templates under the hood, and no bespoke software capability.", muted: true },
    { label: "Quest Digital", body: "Creative and technical, in the same room. The right tool for the job, and a long-term partner who builds, hosts and markets it.", muted: false },
    { label: "Dev-only shops", body: "Strong engineering. But cold and functional, with no design sensibility and no brand or marketing thinking.", muted: true },
  ];
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "118px 40px" }}>
        <Reveal>
          <div style={{ maxWidth: "780px" }}>
            <Eyebrow style={{ marginBottom: "26px" }}>What makes us different</Eyebrow>
            <h2 style={{ margin: 0, fontSize: "clamp(32px, 4.4vw, 56px)", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.02em", color: "var(--quest-heading)" }}>
              We don&rsquo;t separate creativity from <span style={{ color: TEAL }}>technology</span>.
            </h2>
          </div>
        </Reveal>
        <Reveal delay={0.1} style={{ marginTop: "60px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", alignItems: "stretch" }}>
            {cols.map((c) => (
              <div key={c.label} style={{
                position: "relative", padding: "38px 34px", borderRadius: "16px",
                background: c.muted ? "var(--quest-surface-alt)" : INK,
                border: c.muted ? "1px solid var(--quest-border)" : `1px solid ${INK}`,
                color: c.muted ? "var(--quest-body)" : "#fff",
                transform: c.muted ? "none" : "translateY(-12px)",
                boxShadow: c.muted ? "none" : "0 24px 50px rgba(14,36,64,0.28)",
              }}>
                {!c.muted && <div style={{ position: "absolute", top: 0, left: "34px", right: "34px", height: "3px", background: TEAL, borderRadius: "0 0 3px 3px" }}></div>}
                <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: c.muted ? "#9a9a9a" : TEAL_HEX, marginBottom: "16px" }}>{c.label}</div>
                <p style={{ margin: 0, fontSize: "16.5px", fontWeight: 300, lineHeight: 1.6, color: c.muted ? "var(--quest-body)" : "rgba(255,255,255,0.88)" }}>{c.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────── Services — four pillars ─────────────────── */
function Services() {
  const rows = [
    { n: "01", icon: "code-2", title: "Web, Software and Apps", link: "See what we build",
      desc: "Our primary capability. From bespoke enterprise platforms to fast, lightweight Next.js sites with booking and portals built in properly, not bolted on with plugins.",
      tags: ["Next.js & React", "Bespoke software", "Portals & apps", "E-commerce"] },
    { n: "02", icon: "server", title: "Hosting and Managed Services", link: "How we keep it running",
      desc: "We don&rsquo;t build things and disappear. Fully managed hosting means we own the uptime, security, maintenance and support. Everything under one roof.",
      tags: ["Managed hosting", "Security & SSL", "Backups", "SLA support"] },
    { n: "03", icon: "trending-up", title: "Marketing and Growth", link: "Grow your audience",
      desc: "A great website is the start, not the finish. Performance-led SEO, paid media, social and email that get you found and turn visitors into enquiries.",
      tags: ["SEO", "Paid search", "Social", "Email"] },
    { n: "04", icon: "palette", title: "Brand and Design", link: "Build your brand",
      desc: "Great digital work starts with a clear identity. Logo, brand guidelines, print and collateral, so everything looks as good as it works.",
      tags: ["Identity", "Brand guidelines", "Print", "Collateral"] },
  ];
  return (
    <section id="services" style={{ background: INK, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "120px 40px" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "22px" }}>What we do</Eyebrow>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "32px", flexWrap: "wrap", marginBottom: "56px" }}>
            <h2 style={{ margin: 0, fontSize: "clamp(32px, 4.4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>Everything you need.<br />Nothing you don&rsquo;t.</h2>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.78)", maxWidth: "420px" }}>
              A full-service digital studio. Brand to build to hosted, marketed platform, without handing anything off. Most clients stay with us long after the first project.
            </p>
          </div>
        </Reveal>
        <div>
          {rows.map((r, i) => (
            <Reveal key={r.n} delay={i * 0.05}>
              <Pillar {...r} />
            </Reveal>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.14)" }}></div>
        </div>
      </div>
    </section>
  );
}
function Pillar({ n, icon, title, desc, tags, link }) {
  const [h, setH] = React.useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "grid", gridTemplateColumns: "78px 1fr 300px", gap: "36px", alignItems: "start", padding: "42px 0", borderTop: "1px solid rgba(255,255,255,0.14)", transition: "border-color var(--dur) var(--ease)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: TEAL_HEX, letterSpacing: "0.1em" }}>{n}</span>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "12px", background: h ? TEAL : "rgba(255,255,255,0.06)", border: `1px solid ${h ? TEAL : "rgba(255,255,255,0.16)"}`, color: h ? INK : "#fff", transition: "all var(--dur) var(--ease)" }}>
          <Icon name={icon} size={22} />
        </span>
      </div>
      <div>
        <h3 style={{ margin: "0 0 14px", fontSize: "29px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{title}</h3>
        <p style={{ margin: "0 0 22px", fontSize: "17px", fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.78)", maxWidth: "560px" }} dangerouslySetInnerHTML={{ __html: desc }}></p>
        <ArrowLink dark>{link}</ArrowLink>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingTop: "6px" }}>
        {tags.map((t) => (
          <span key={t} style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.22)", padding: "7px 14px", borderRadius: "999px" }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── Tech marquee (right tool) ─────────────────── */
function Tech() {
  const stack = ["Next.js", "React", "Ruby on Rails", ".NET", "PHP", "Flutter", "Payload CMS", "WordPress", "Stripe", "Docker", "Vercel", "Figma", "Claude"];
  const row = [...stack, ...stack];
  return (
    <section style={{ background: TEAL, color: INK, overflow: "hidden", borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}` }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ flexShrink: 0, padding: "0 30px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", borderRight: `1px solid rgba(14,36,64,0.25)`, alignSelf: "stretch", display: "flex", alignItems: "center" }}>
          The right tool<br />for the job
        </div>
        <div style={{ overflow: "hidden", flex: 1, padding: "20px 0" }}>
          <div style={{ display: "flex", gap: "0", whiteSpace: "nowrap", width: "max-content", animation: "qd-marquee 36s linear infinite" }}>
            {row.map((it, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "30px", paddingRight: "30px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {it}<span style={{ fontSize: "9px", opacity: 0.55 }}>●</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── Two tracks ─────────────────── */
function Tracks() {
  return (
    <section id="tracks" style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "120px 40px" }}>
        <Reveal>
          <div style={{ maxWidth: "720px", marginBottom: "56px" }}>
            <Eyebrow style={{ marginBottom: "22px" }}>Two client tracks</Eyebrow>
            <h2 style={{ margin: "0 0 20px", fontSize: "clamp(32px, 4.4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08, color: "var(--quest-heading)" }}>Built for businesses of every size.</h2>
            <p style={{ margin: 0, fontSize: "19px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)" }}>
              We work with enterprise clients building complex platforms and small businesses who just want a website that does more. Different scales, same level of care.
            </p>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "26px" }}>
          <Reveal delay={0.05} style={{ display: "flex" }}>
            <TrackCard dark eyebrow="Enterprise & complex platforms" title="Complex problems, properly solved."
              body="For businesses with serious digital requirements. Bespoke software, portals and integrations, built by a team who understand the technology and the business behind it."
              cta="Talk to us about your project" />
          </Reveal>
          <Reveal delay={0.12} style={{ display: "flex" }}>
            <TrackCard eyebrow="Smart sites for small business" title="A better website than you thought you could afford."
              body="For small businesses tired of slow, clunky WordPress sites. Clean, fast sites with booking, stock and customer portals built in properly, not bolted on."
              cta="See what&rsquo;s possible" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
function TrackCard({ dark, eyebrow, title, body, cta }) {
  const [h, setH] = React.useState(false);
  return (
    <div style={{
      display: "flex", flexDirection: "column", width: "100%", padding: "44px 42px", borderRadius: "20px",
      background: dark ? INK : "#fff",
      border: dark ? `1px solid ${INK}` : `2px solid ${h ? TEAL_HEX : "var(--quest-border)"}`,
      color: dark ? "#fff" : "var(--quest-heading)",
      boxShadow: dark ? "0 24px 50px rgba(14,36,64,0.22)" : "none",
      transition: "border-color var(--dur) var(--ease), transform var(--dur) var(--ease)",
      transform: h ? "translateY(-4px)" : "translateY(0)",
    }} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "20px" }}>{eyebrow}</div>
      <h3 style={{ margin: "0 0 18px", fontSize: "28px", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.15 }}>{title}</h3>
      <p style={{ margin: "0 0 30px", fontSize: "17px", fontWeight: 300, lineHeight: 1.65, color: dark ? "rgba(255,255,255,0.8)" : "var(--quest-body)" }}>{body}</p>
      <div style={{ marginTop: "auto" }}>
        <a href="#contact" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "15px", fontWeight: 600, color: dark ? INK : "#fff", background: dark ? "#fff" : INK, padding: "14px 26px", borderRadius: "999px", textDecoration: "none", transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = TEAL_HEX; e.currentTarget.style.color = INK; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = dark ? "#fff" : INK; e.currentTarget.style.color = dark ? INK : "#fff"; }}
          dangerouslySetInnerHTML={{ __html: cta + " &rarr;" }}></a>
      </div>
    </div>
  );
}

/* ─────────────────── Why work with us ─────────────────── */
function Why() {
  const items = [
    { icon: "layers", title: "Genuinely full stack", body: "Brand, build, hosting and marketing under one roof. No handoffs, no gaps, no \u201cthat\u2019s not our department\u201d." },
    { icon: "git-branch", title: "The right tool, not the familiar one", body: "Experience across WordPress, Next.js, React, Ruby on Rails, .NET, PHP and more. We use what\u2019s right for the job, and tell you why." },
    { icon: "sparkles", title: "We embrace AI the right way", body: "Tools like Claude and ChatGPT help us work smarter and faster. The thinking, the craft and the accountability stay with us." },
    { icon: "users", title: "You talk to the people doing the work", body: "A small, senior team. No account managers, no juniors handed your project on day two. Direct access to people who know what they\u2019re doing." },
    { icon: "infinity", title: "In it for the long term", body: "Our best client relationships have lasted years. We want to understand your business, not just complete a brief." },
    { icon: "shield-check", title: "ISO 27001 certified", body: "We operate to an enterprise-grade information security standard. Important if you handle sensitive data or work in a regulated industry." },
  ];
  return (
    <section id="about" style={{ background: "var(--quest-surface-alt)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "120px 40px" }}>
        <Reveal>
          <Eyebrow style={{ marginBottom: "22px" }}>Why Quest Digital</Eyebrow>
          <h2 style={{ margin: "0 0 60px", fontSize: "clamp(32px, 4.4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--quest-heading)" }}>Why work with us?</h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {items.map((it, i) => (
            <Reveal key={it.title} delay={(i % 3) * 0.06}>
              <div style={{ height: "100%", background: "#fff", border: "1px solid var(--quest-border)", borderRadius: "16px", padding: "34px 32px", transition: "box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease)" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 16px 38px rgba(33,75,127,0.1)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", borderRadius: "12px", background: "rgba(42,179,192,0.12)", color: TEAL_HEX, marginBottom: "22px" }}>
                  <Icon name={it.icon} size={24} />
                </span>
                <h3 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.005em", lineHeight: 1.25, color: "var(--quest-heading)" }}>{it.title}</h3>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)" }}>{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────── Work preview ─────────────────── */
/* NOTE: representative placeholders — swap images/copy for refreshed Flow Media
   case studies once confirmed (see service-definition open questions). */
function Work() {
  const cards = [
    { img: `${A}/images/healthcare.jpg`, tag: "Healthcare · Web App", title: "Booking & patient portal", blurb: "A booking and customer portal that cut admin time and replaced a stack of spreadsheets." },
    { img: `${A}/images/asset-management.jpg`, tag: "Logistics · Dashboard", title: "Live operations dashboard", blurb: "Real-time data turned into one clear view a team can act on instantly." },
    { img: `${A}/images/partnership.jpg`, tag: "Professional services · Web", title: "Marketing site & CMS", blurb: "A fast, lightweight Next.js site the team can edit and run themselves." },
  ];
  return (
    <section id="work" style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "120px 40px" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "24px", marginBottom: "56px" }}>
            <div style={{ maxWidth: "620px" }}>
              <Eyebrow style={{ marginBottom: "22px" }}>Selected work</Eyebrow>
              <h2 style={{ margin: "0 0 18px", fontSize: "clamp(32px, 4.4vw, 56px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08, color: "var(--quest-heading)" }}>Some of what we have built.</h2>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)" }}>A selection of projects across different sectors and scales.</p>
            </div>
            <Button variant="primary" href="#">View all our work</Button>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "26px" }}>
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.06}><WorkCard {...c} /></Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
function WorkCard({ img, tag, title, blurb }) {
  const [h, setH] = React.useState(false);
  return (
    <a href="#" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "block", textDecoration: "none", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--quest-border)", background: "#fff", transition: "border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease)", boxShadow: h ? "0 18px 40px rgba(33,75,127,0.12)" : "none", borderColor: h ? TEAL_HEX : "var(--quest-border)" }}>
      <div style={{ overflow: "hidden", aspectRatio: "16 / 10", background: INK }}>
        <img src={img} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", transform: h ? "scale(1.05)" : "scale(1)", transition: "transform 0.6s var(--ease)" }} />
      </div>
      <div style={{ padding: "26px 28px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL_HEX }}>{tag}</span>
          <span style={{ color: TEAL_HEX, opacity: h ? 1 : 0, transform: h ? "translate(0,0)" : "translate(-4px,4px)", transition: "all 0.4s var(--ease)" }}><Icon name="arrow-up-right" size={17} /></span>
        </div>
        <h3 style={{ margin: "0 0 10px", fontSize: "21px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2, color: h ? TEAL_HEX : "var(--quest-heading)", transition: "color var(--dur) var(--ease)" }}>{title}</h3>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 300, lineHeight: 1.55, color: "var(--quest-body)" }}>{blurb}</p>
      </div>
    </a>
  );
}

/* ─────────────────── Contact / CTA ─────────────────── */
function Contact() {
  const { Field, Input, Textarea } = NS;
  const [sent, setSent] = React.useState(false);
  return (
    <section id="contact" style={{ position: "relative", overflow: "hidden", background: INK }}>
      <div style={{ position: "absolute", top: "-40%", right: "-5%", width: "70vw", height: "70vw", background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, rgba(42,179,192,0) 60%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "120px 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "72px", alignItems: "start" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "26px" }}>Get in touch</Eyebrow>
          <h2 style={{ margin: "0 0 22px", fontSize: "clamp(34px, 4.6vw, 60px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05, color: "#fff" }}>Got a project in mind?</h2>
          <p style={{ margin: "0 0 34px", fontSize: "19px", fontWeight: 300, lineHeight: 1.65, color: "rgba(255,255,255,0.82)", maxWidth: "440px" }}>
            Whether you know exactly what you need or you&rsquo;re still figuring it out, we&rsquo;re happy to have a conversation. No hard sell, no jargon. Just an honest chat about what we can do for you.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <a href="mailto:hello@questdesign.co.uk" style={{ display: "inline-flex", alignItems: "center", gap: "12px", fontSize: "17px", fontWeight: 500, color: "#fff", textDecoration: "none" }}>
              <Icon name="mail" size={19} color={TEAL_HEX} /> hello@questdesign.co.uk
            </a>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "12px", fontSize: "15px", fontWeight: 300, color: "rgba(255,255,255,0.7)" }}>
              <Icon name="clock" size={18} color={TEAL_HEX} /> We aim to respond within one working day.
            </span>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px", padding: "38px 36px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <Field label="Name" onDark htmlFor="qd-name"><Input id="qd-name" onDark placeholder="Your name" required /></Field>
              <Field label="Email" onDark htmlFor="qd-email"><Input id="qd-email" type="email" onDark placeholder="you@company.co.uk" required /></Field>
              <Field label="Tell us about your project" onDark htmlFor="qd-msg"><Textarea id="qd-msg" onDark rows={4} placeholder="A few lines on what you&rsquo;re looking to build…" /></Field>
              <button type="submit" style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "16px", fontWeight: 600, color: INK, background: sent ? "#fff" : TEAL, border: "none", padding: "18px 28px", borderRadius: "999px", cursor: "pointer", transition: "transform var(--dur) var(--ease)" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
                {sent ? <React.Fragment><Icon name="check" size={18} /> Thank you, we&rsquo;ll be in touch</React.Fragment> : <React.Fragment>Send message <Icon name="arrow-right" size={18} /></React.Fragment>}
              </button>
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── App ─────────────────────────── */
function App() {
  React.useEffect(() => {
    const draw = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };
    draw();
    const t = setTimeout(draw, 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <Header />
      <Hero />
      <Proof />
      <Difference />
      <Services />
      <Tech />
      <Tracks />
      <Why />
      <Work />
      <Contact />
      <Footer />
    </div>
  );
}

window.App = App;
