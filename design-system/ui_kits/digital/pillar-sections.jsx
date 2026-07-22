/* Quest Digital — Service pillar DETAIL pages.
   One content-driven template; the pillar is chosen via <App pillar="web" />.
   Consumes home-base.jsx (Header / Footer / Reveal / Eyebrow / Icon). */

const { A, TEAL, TEAL_HEX, INK, INK2, INK3, Reveal, Icon, Eyebrow, Header, Footer } = window;

/* ─────────────────────────────  DATA  ───────────────────────────── */

const PILLARS = {
  web: {
    key: "web", n: "01", icon: "code-2", primary: true, href: "service-web.html",
    name: "Web, Software and Apps",
    tagline: "We design and build the digital things people actually use.",
    lead: "Our primary capability — from large enterprise platforms to fast, lightweight sites for small businesses. We choose the right technology, not the easiest one.",
    facts: [["Pricing", "Project-based"], ["Two tracks", "Enterprise & small business"], ["Delivery", "UK & remote"]],
    included: [
      { label: "Enterprise & complex builds", items: ["Bespoke software and internal business systems", "Web applications and client portals", "Mobile applications (iOS and Android)", "API integrations and third-party connectivity", "Legacy system modernisation", "E-commerce for complex, high-volume operations"] },
      { label: "Small business & smart sites", items: ["Fast Next.js & React sites — no bloat", "WordPress where it genuinely fits", "Built-in booking, inventory & stock logging", "Customer portals done properly", "E-commerce via Shopify, WooCommerce or custom", "CMS integration and content setup"] },
    ],
    approach: [
      { icon: "wrench", title: "Right tool for the job", desc: "We assess what you actually need, then choose the technology — not the other way round." },
      { icon: "shield", title: "Built to last", desc: "Properly engineered foundations, not plugins fighting each other. Things that still work in three years." },
      { icon: "users", title: "Direct access", desc: "You talk to the people building it. No account-manager layer between you and the work." },
    ],
    pricing: { kind: "model", model: "Project-based", note: "We scope requirements properly before quoting. We don't do fixed packages for bespoke build — scope varies too much. We'd rather give an honest quote than an arbitrary package that doesn't fit.", chips: ["Proper scoping first", "Honest quotes", "No arbitrary packages"] },
    techLabel: "Technology", tech: ["Next.js", "React", "Ruby on Rails", ".NET", "PHP", "WordPress", "Flutter", "Payload CMS", "Stripe"],
    whoFor: [
      { title: "Enterprise & complex platforms", desc: "Large organisations needing bespoke software, portals or internal systems — including regulated sectors where ISO 27001 is a genuine advantage." },
      { title: "Small business & smart sites", desc: "SMEs who've outgrown WordPress and want booking, inventory or portals done properly — not bolted on with plugins." },
    ],
    work: [{ tag: "Booking & patient portal", meta: "Healthcare · Next.js platform" }, { tag: "Stock management system", meta: "Retail · Bespoke web app" }],
    ctaTitle: "Got a build in mind?", ctaSub: "Tell us what you're trying to make. We'll scope it honestly.",
  },

  hosting: {
    key: "hosting", n: "02", icon: "server", primary: false, href: "service-hosting.html",
    name: "Hosting and Managed Services",
    tagline: "We keep it running — securely, reliably, and without you thinking about it.",
    lead: "Most agencies build your site and walk away. We don't. Fully managed hosting means we own the uptime, the security, the maintenance and the support.",
    facts: [["Plans", "Three tiers"], ["Security", "ISO 27001 certified"], ["Support", "Incident response"]],
    included: [
      { label: null, items: ["Managed web hosting", "Domain registration & DNS management", "SSL certificate management", "Security monitoring and patching", "Platform updates and CMS maintenance", "Regular backups and disaster recovery", "Technical support and incident response", "Performance monitoring"] },
    ],
    approach: [
      { icon: "circle-check-big", title: "We own it", desc: "Uptime, security, maintenance and support — all ours, not your problem to manage." },
      { icon: "shield-check", title: "Secure by standard", desc: "ISO 27001 certified infrastructure and proactive patching, not reactive firefighting." },
      { icon: "layers", title: "Under one roof", desc: "Build, host and market with one partner. One number to call when it matters." },
    ],
    pricing: {
      kind: "tiers", eyebrow: "Plans & pricing", note: "Monthly plans, tiered by resources and SLA. Specific pricing on enquiry — plans are scoped to what you're actually running.",
      tiers: [
        { name: "Essentials", best: "Small business sites", includes: ["Managed hosting & SSL", "Monthly maintenance", "Email support", "Regular backups"] },
        { name: "Business", best: "Growing businesses & e-commerce", featured: true, includes: ["Everything in Essentials", "Priority support", "Enhanced backups", "Uptime monitoring"] },
        { name: "Enterprise", best: "Applications, portals & regulated clients", includes: ["Everything in Business", "Dedicated resource", "SLA guarantee", "Security reporting"] },
      ],
    },
    techLabel: "Infrastructure", tech: ["Docker", "Coolify", "Vercel", "Cloudflare", "ISO 27001 infra"],
    whoFor: [
      { title: "Clients we've built for", desc: "Everything we make can sit under one roof — we own the uptime, the security and the support, so you don't think about it." },
      { title: "Regulated industries", desc: "ISO 27001 certified infrastructure, suitable for healthcare, legal and financial-services clients." },
      { title: "Anyone left to fend for themselves", desc: "If your last agency built it and vanished, we're the opposite. We stay for the long term." },
    ],
    work: [{ tag: "Zero-downtime migration", meta: "Legal · Managed platform move" }, { tag: "Regulated infrastructure", meta: "Finance · ISO 27001 hosting" }],
    ctaTitle: "Tired of being left to fend for yourself?", ctaSub: "Let us take hosting, security and support off your plate for good.",
  },

  marketing: {
    key: "marketing", n: "03", icon: "trending-up", primary: false, href: "service-marketing.html",
    name: "Marketing and Growth",
    tagline: "We make sure people find you — and that when they do, they convert.",
    lead: "A great website is the start, not the finish. We handle the ongoing work of digital marketing: SEO, paid campaigns, social and email. Performance-led, not vanity-led.",
    facts: [["Pricing", "Monthly retainer"], ["Approach", "Performance-led"], ["Reporting", "Monthly, clear"]],
    included: [
      { label: null, items: ["Search engine optimisation — technical, on-page & off-page", "Google Ads and paid search (PPC)", "Paid social advertising", "Social media management and content", "Email marketing — strategy, design & automation", "Analytics setup and reporting", "Content strategy"] },
    ],
    approach: [
      { icon: "target", title: "Performance-led", desc: "We measure what matters — enquiries and revenue, not vanity metrics that look good in a slide." },
      { icon: "file-text", title: "Honest reporting", desc: "Clear monthly reporting you can actually read. No smoke, no mirrors, no jargon." },
      { icon: "zap", title: "Solid foundations", desc: "Marketing works better on a fast, well-built site. We do both, so the two pull together." },
    ],
    pricing: {
      kind: "tiers", eyebrow: "Retainer tiers", note: "Monthly retainer, tiered by activity level. Exact pricing on enquiry — retainer scope is shaped to the client.",
      tiers: [
        { name: "Foundation", best: "Establishing a baseline", includes: ["Core SEO", "Technical & on-page", "Monthly reporting", "Search Console setup"] },
        { name: "Growth", best: "Actively seeking leads", featured: true, includes: ["Everything in Foundation", "One paid channel", "Social management", "Conversion tracking"] },
        { name: "Accelerate", best: "Ready to scale", includes: ["Everything in Growth", "Full paid media", "Email automation", "Content strategy"] },
      ],
    },
    techLabel: "Tools & platforms", tech: ["Google Ads", "GA4", "Search Console", "Meta Ads", "Klaviyo", "SEO"],
    whoFor: [
      { title: "Sites that aren't converting", desc: "Businesses with a website that simply isn't generating enough enquiries to justify it." },
      { title: "Teams without a marketer", desc: "Businesses that want consistent, measurable digital marketing without hiring someone in-house." },
    ],
    work: [{ tag: "Lead-gen SEO campaign", meta: "B2B services · enquiry growth" }, { tag: "Paid social launch", meta: "E-commerce · ROAS focus" }],
    ctaTitle: "Want more enquiries from your site?", ctaSub: "Let's build a marketing engine that actually performs — and prove it monthly.",
  },

  brand: {
    key: "brand", n: "04", icon: "palette", primary: false, href: "service-brand.html",
    name: "Brand and Design",
    tagline: "We build the visual identity that everything else sits on.",
    lead: "Great digital work starts with a clear identity. We offer brand as a supporting capability — because a software or web project often needs it, and we're good at it.",
    facts: [["Offer", "Supporting capability"], ["Pricing", "Project-based"], ["Output", "Digital & print"]],
    included: [
      { label: null, items: ["Logo design and full visual identity", "Brand guidelines and style documentation", "Brand refresh and evolution projects", "Print design — brochures, stationery, signage", "Marketing collateral and campaign assets", "Presentation templates"] },
    ],
    approach: [
      { icon: "shapes", title: "Design that translates", desc: "Identity built to work properly in the digital products and sites it's made from — not just on a logo sheet." },
      { icon: "sparkles", title: "Looks great, works great", desc: "We don't separate creativity from technology. For us, good design and good engineering are the same conversation." },
      { icon: "package", title: "Everything in one place", desc: "Brand, build and marketing from one studio. No briefing three different suppliers." },
    ],
    pricing: { kind: "model", model: "Project-based", note: "Brand is a supporting capability — we offer it because projects often need it, and because we're good at it. Quoted per project, and frequently bundled with a web or software build.", chips: ["Per project", "Often bundled with a build", "Digital & print"] },
    techLabel: "Tools", tech: ["Figma", "Adobe Creative Suite", "Print production"],
    whoFor: [
      { title: "Existing clients", desc: "Who need brand work alongside a build or marketing project, without going elsewhere for it." },
      { title: "Starting from scratch", desc: "Businesses who want everything — identity, site and marketing — in one place, from one team." },
    ],
    work: [{ tag: "Identity & guidelines", meta: "Group rebrand · Full system" }, { tag: "Print & collateral", meta: "Healthcare · Signage & stationery" }],
    ctaTitle: "Need an identity that works as hard as you do?", ctaSub: "Let's give your business a look that lasts — and translates everywhere.",
  },
};

const ORDER = ["web", "hosting", "marketing", "brand"];

/* ─────────────────────────────  PRIMITIVES  ───────────────────────────── */

function PrimaryBtn({ href = "contact.html", children, dark = false }) {
  const [h, setH] = React.useState(false);
  return (
    <a href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 600, color: INK, background: TEAL_HEX, padding: "16px 30px", borderRadius: "999px", textDecoration: "none", transform: h ? "translateY(-2px)" : "translateY(0)", transition: "transform var(--dur) var(--ease)" }}>
      {children} <Icon name="arrow-right" size={18} />
    </a>
  );
}
function GhostBtn({ href = "#", children }) {
  const [h, setH] = React.useState(false);
  return (
    <a href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 500, color: "#fff", border: "1px solid rgba(255,255,255,0.32)", background: h ? "rgba(255,255,255,0.1)" : "transparent", padding: "15px 28px", borderRadius: "999px", textDecoration: "none", transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease)" }}>
      {children}
    </a>
  );
}

/* ─────────────────────────────  HERO  ───────────────────────────── */

function PillarHero({ p }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff", paddingTop: "150px", paddingBottom: "96px" }}>
      <div style={{ position: "absolute", top: "-28%", right: "-12%", width: "58vw", height: "58vw", background: "radial-gradient(circle, rgba(42,179,192,0.20) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-26%", left: "-14%", width: "48vw", height: "48vw", background: "radial-gradient(circle, rgba(43,123,185,0.20) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          {/* breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", fontWeight: 500, color: "rgba(255,255,255,0.6)", marginBottom: "30px" }}>
            <a href="services.html" style={{ display: "inline-flex", alignItems: "center", gap: "7px", color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
              <Icon name="arrow-left" size={15} /> Services
            </a>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: TEAL_HEX }}>Pillar {p.n}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "64px", alignItems: "end" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "58px", height: "58px", borderRadius: "14px", background: "rgba(42,179,192,0.14)", border: "1px solid rgba(42,179,192,0.3)", color: TEAL_HEX }}>
                  <Icon name={p.icon} size={28} />
                </span>
                {p.primary && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEAL_HEX, background: "rgba(42,179,192,0.14)", padding: "6px 13px", borderRadius: "999px" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: TEAL_HEX }}></span> Primary capability
                  </span>
                )}
              </div>
              <h1 style={{ margin: "0 0 22px", fontWeight: 700, fontSize: "clamp(40px, 5.4vw, 72px)", letterSpacing: "-0.025em", lineHeight: 1.02 }}>{p.name}</h1>
              <p style={{ margin: "0 0 18px", fontSize: "22px", fontWeight: 300, lineHeight: 1.5, color: "#fff", maxWidth: "30ch" }}>{p.tagline}</p>
              <p style={{ margin: "0 0 38px", fontSize: "17px", fontWeight: 300, lineHeight: 1.65, color: "rgba(255,255,255,0.74)", maxWidth: "52ch" }}>{p.lead}</p>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <PrimaryBtn href="contact.html">Start a project</PrimaryBtn>
                <GhostBtn href="#work">See selected work</GhostBtn>
              </div>
            </div>

            {/* quick facts */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", overflow: "hidden" }}>
              {p.facts.map(([k, v], i) => (
                <div key={k} style={{ background: INK2, padding: "22px 26px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "8px" }}>{k}</div>
                  <div style={{ fontSize: "20px", fontWeight: 500, color: "#fff", letterSpacing: "-0.01em" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────  WHAT'S INCLUDED  ───────────────────────────── */

function CheckItem({ children }) {
  return (
    <li style={{ display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "16px", fontWeight: 400, color: "var(--quest-body)", lineHeight: 1.5 }}>
      <span style={{ flexShrink: 0, marginTop: "3px", color: TEAL_HEX }}><Icon name="check" size={16} /></span>
      {children}
    </li>
  );
}

function Included({ p }) {
  const grouped = p.included.length > 1;
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow style={{ marginBottom: "22px" }}>What's included</Eyebrow>
          <h2 style={{ margin: "0 0 54px", fontSize: "clamp(30px, 3.6vw, 46px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--quest-heading)", maxWidth: "20ch" }}>Everything this pillar covers.</h2>
        </Reveal>
        <Reveal delay={0.06}>
          {grouped ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
              {p.included.map((g) => (
                <div key={g.label} style={{ border: "1px solid var(--quest-border)", borderRadius: "18px", padding: "34px 34px 38px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "22px" }}>{g.label}</div>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "15px" }}>
                    {g.items.map((it) => <CheckItem key={it}>{it}</CheckItem>)}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 56px" }}>
              {p.included[0].items.map((it) => (
                <li key={it} style={{ display: "flex", alignItems: "flex-start", gap: "13px", padding: "16px 0", borderTop: "1px solid var(--quest-border)", fontSize: "17px", fontWeight: 400, color: "var(--quest-heading)", lineHeight: 1.45 }}>
                  <span style={{ flexShrink: 0, marginTop: "2px", color: TEAL_HEX }}><Icon name="check" size={17} /></span>
                  {it}
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────  APPROACH  ───────────────────────────── */

function Approach({ p }) {
  return (
    <section style={{ background: "var(--quest-surface-alt)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow style={{ marginBottom: "22px" }}>How we work</Eyebrow>
          <h2 style={{ margin: "0 0 54px", fontSize: "clamp(30px, 3.6vw, 46px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--quest-heading)", maxWidth: "18ch" }}>What you can count on.</h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px" }}>
          {p.approach.map((a, i) => (
            <Reveal key={a.title} delay={0.05 * i}>
              <div style={{ background: "#fff", border: "1px solid var(--quest-border)", borderRadius: "18px", padding: "34px 32px 36px", height: "100%" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "50px", height: "50px", borderRadius: "12px", background: "rgba(42,179,192,0.12)", color: TEAL_HEX, marginBottom: "22px" }}>
                  <Icon name={a.icon} size={23} />
                </span>
                <h3 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--quest-heading)" }}>{a.title}</h3>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)" }}>{a.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────  PRICING  ───────────────────────────── */

function Pricing({ p }) {
  const pr = p.pricing;
  if (pr.kind === "tiers") {
    return (
      <section style={{ background: "#fff" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
          <Reveal>
            <Eyebrow style={{ marginBottom: "22px" }}>{pr.eyebrow}</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "40px", flexWrap: "wrap", marginBottom: "50px" }}>
              <h2 style={{ margin: 0, fontSize: "clamp(30px, 3.6vw, 46px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--quest-heading)", maxWidth: "16ch" }}>Plans scoped to what you run.</h2>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)", maxWidth: "400px" }}>{pr.note}</p>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px", alignItems: "stretch" }}>
            {pr.tiers.map((t, i) => (
              <Reveal key={t.name} delay={0.05 * i}>
                <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", borderRadius: "18px", padding: "34px 32px 34px", background: t.featured ? INK : "#fff", border: t.featured ? "none" : "2px solid var(--quest-border)", boxShadow: t.featured ? "0 28px 60px -34px rgba(14,36,64,0.55)" : "none" }}>
                  {t.featured && <span style={{ position: "absolute", top: 0, left: "32px", right: "32px", height: "3px", background: TEAL_HEX, borderRadius: "0 0 3px 3px" }}></span>}
                  {t.featured && <span style={{ position: "absolute", top: "20px", right: "24px", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL_HEX }}>Most popular</span>}
                  <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "10px" }}>{t.best}</div>
                  <div style={{ fontSize: "27px", fontWeight: 700, letterSpacing: "-0.01em", color: t.featured ? "#fff" : "var(--quest-heading)", marginBottom: "18px" }}>{t.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", paddingBottom: "22px", marginBottom: "22px", borderBottom: `1px solid ${t.featured ? "rgba(255,255,255,0.14)" : "var(--quest-border)"}` }}>
                    <span style={{ fontSize: "22px", fontWeight: 700, color: t.featured ? "#fff" : "var(--quest-heading)" }}>On enquiry</span>
                  </div>
                  <ul style={{ listStyle: "none", margin: "0 0 28px", padding: 0, display: "flex", flexDirection: "column", gap: "13px", flex: 1 }}>
                    {t.includes.map((it) => (
                      <li key={it} style={{ display: "flex", alignItems: "flex-start", gap: "11px", fontSize: "15px", fontWeight: 400, lineHeight: 1.45, color: t.featured ? "rgba(255,255,255,0.86)" : "var(--quest-body)" }}>
                        <span style={{ flexShrink: 0, marginTop: "2px", color: TEAL_HEX }}><Icon name="check" size={15} /></span>{it}
                      </li>
                    ))}
                  </ul>
                  <a href="contact.html" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "15px", fontWeight: 600, padding: "13px 20px", borderRadius: "999px", textDecoration: "none", background: t.featured ? TEAL_HEX : "transparent", color: t.featured ? INK : INK, border: t.featured ? "none" : `1.5px solid ${INK}`, transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)" }}
                    onMouseEnter={(e) => { if (!t.featured) { e.currentTarget.style.background = INK; e.currentTarget.style.color = "#fff"; } }}
                    onMouseLeave={(e) => { if (!t.featured) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = INK; } }}>
                    Get a quote <Icon name="arrow-right" size={15} />
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }
  /* model callout (web, brand) */
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <div style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff", borderRadius: "22px", padding: "56px 56px" }}>
            <div style={{ position: "absolute", top: "-40%", right: "-6%", width: "34vw", height: "34vw", background: "radial-gradient(circle, rgba(42,179,192,0.18) 0%, transparent 64%)", pointerEvents: "none" }}></div>
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "48px", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "16px" }}>How we price</div>
                <div style={{ fontSize: "clamp(34px, 3.4vw, 48px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{pr.model}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "9px", marginTop: "26px" }}>
                  {pr.chips.map((c) => (
                    <span key={c} style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.22)", padding: "8px 15px", borderRadius: "999px" }}>{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 28px", fontSize: "18px", fontWeight: 300, lineHeight: 1.65, color: "rgba(255,255,255,0.84)" }}>{pr.note}</p>
                <PrimaryBtn href="contact.html">Get an honest quote</PrimaryBtn>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────  WHO IT'S FOR  ───────────────────────────── */

function WhoFor({ p }) {
  return (
    <section style={{ background: "var(--quest-surface-alt)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow style={{ marginBottom: "22px" }}>Who it's for</Eyebrow>
          <h2 style={{ margin: "0 0 50px", fontSize: "clamp(30px, 3.6vw, 46px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--quest-heading)", maxWidth: "18ch" }}>Built for clients like these.</h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: p.whoFor.length === 3 ? "repeat(3, 1fr)" : "1fr 1fr", gap: "22px" }}>
          {p.whoFor.map((w, i) => (
            <Reveal key={w.title} delay={0.05 * i}>
              <div style={{ background: "#fff", border: "1px solid var(--quest-border)", borderRadius: "18px", padding: "34px 34px 36px", height: "100%" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "999px", background: "rgba(42,179,192,0.12)", color: TEAL_HEX, marginBottom: "20px" }}>
                  <Icon name="check" size={19} />
                </span>
                <h3 style={{ margin: "0 0 12px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--quest-heading)" }}>{w.title}</h3>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)" }}>{w.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────  TECH BAND  ───────────────────────────── */

function TechBand({ p }) {
  return (
    <section style={{ background: INK, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "84px 40px" }}>
        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.4fr", gap: "48px", alignItems: "center" }}>
            <div>
              <Eyebrow onDark style={{ marginBottom: "18px" }}>{p.techLabel}</Eyebrow>
              <h2 style={{ margin: 0, fontSize: "clamp(26px, 2.8vw, 36px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.12 }}>The right tool, not the familiar one.</h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {p.tech.map((t) => (
                <span key={t} style={{ fontSize: "15px", fontWeight: 500, color: "rgba(255,255,255,0.92)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", padding: "11px 20px", borderRadius: "999px" }}>{t}</span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────  SELECTED WORK (placeholder)  ───────────────────────────── */

function WorkProof({ p }) {
  return (
    <section id="work" style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "30px", flexWrap: "wrap", marginBottom: "44px" }}>
            <div>
              <Eyebrow style={{ marginBottom: "22px" }}>Selected work</Eyebrow>
              <h2 style={{ margin: 0, fontSize: "clamp(30px, 3.6vw, 46px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--quest-heading)" }}>Proof, not promises.</h2>
            </div>
            <a href="work.html" style={{ display: "inline-flex", alignItems: "center", gap: "9px", fontSize: "15px", fontWeight: 600, color: INK, textDecoration: "none" }}>
              View all work <span style={{ color: TEAL_HEX }}>→</span>
            </a>
          </div>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {p.work.map((w, i) => (
            <Reveal key={w.tag} delay={0.06 * i}>
              <a href="work.html" style={{ display: "block", textDecoration: "none", borderRadius: "20px", overflow: "hidden", border: "1px solid var(--quest-border)" }}>
                <div style={{ position: "relative", aspectRatio: "16 / 9", background: "repeating-linear-gradient(135deg,#eef2f6,#eef2f6 11px,#e3e9f0 11px,#e3e9f0 22px)" }}>
                  <span style={{ position: "absolute", top: "14px", left: "14px", fontSize: "11px", fontWeight: 500, fontFamily: "var(--font-mono, ui-monospace, monospace)", letterSpacing: "0.04em", color: "#6a7889", background: "rgba(255,255,255,0.85)", padding: "6px 10px", borderRadius: "6px" }}>case study · 16:9</span>
                </div>
                <div style={{ padding: "24px 26px 28px", background: "#fff" }}>
                  <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "9px" }}>{w.meta}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                    <h3 style={{ margin: 0, fontSize: "21px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--quest-heading)" }}>{w.tag}</h3>
                    <span style={{ color: TEAL_HEX, fontSize: "18px" }}>→</span>
                  </div>
                </div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────  PAIRED WITH  ───────────────────────────── */

function PairedWith({ p }) {
  const others = ORDER.filter((k) => k !== p.key).map((k) => PILLARS[k]);
  return (
    <section style={{ background: "var(--quest-surface-alt)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow style={{ marginBottom: "22px" }}>Works well with</Eyebrow>
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(30px, 3.6vw, 46px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--quest-heading)" }}>Most clients stay for more than one.</h2>
          <p style={{ margin: "0 0 48px", fontSize: "18px", fontWeight: 300, color: "var(--quest-body)", maxWidth: "52ch" }}>Brand, build, hosting and marketing under one roof — no handoffs, no gaps.</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "22px" }}>
          {others.map((o, i) => (
            <Reveal key={o.key} delay={0.05 * i}>
              <a href={o.href} style={{ display: "block", height: "100%", background: "#fff", border: "1px solid var(--quest-border)", borderRadius: "18px", padding: "30px 30px 32px", textDecoration: "none", transition: "transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(33,75,127,0.12)"; e.currentTarget.style.borderColor = "rgba(42,179,192,0.5)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--quest-border)"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: "13px", marginBottom: "18px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "44px", height: "44px", borderRadius: "12px", background: "rgba(42,179,192,0.12)", color: TEAL_HEX }}>
                    <Icon name={o.icon} size={21} />
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: TEAL_HEX }}>{o.n}</span>
                </div>
                <h3 style={{ margin: "0 0 9px", fontSize: "19px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--quest-heading)" }}>{o.name}</h3>
                <p style={{ margin: "0 0 18px", fontSize: "15px", fontWeight: 300, lineHeight: 1.55, color: "var(--quest-body)" }}>{o.tagline}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: INK }}>Explore <span style={{ color: TEAL_HEX }}>→</span></span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────  FINAL CTA  ───────────────────────────── */

function FinalCTA({ p }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff" }}>
      <div style={{ position: "absolute", top: "-30%", left: "50%", transform: "translateX(-50%)", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", maxWidth: "1280px", margin: "0 auto", padding: "110px 40px", textAlign: "center" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "26px", justifyContent: "center" }}>Let's talk</Eyebrow>
          <h2 style={{ margin: "0 auto 18px", fontSize: "clamp(32px, 4.4vw, 58px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.04, maxWidth: "20ch" }}>{p.ctaTitle}</h2>
          <p style={{ margin: "0 auto 38px", fontSize: "19px", fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.78)", maxWidth: "52ch" }}>{p.ctaSub}</p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <PrimaryBtn href="contact.html">Start a conversation</PrimaryBtn>
            <GhostBtn href="services.html">Explore all services</GhostBtn>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────────  APP  ───────────────────────────── */

function App({ pillar }) {
  const key = pillar || window.PILLAR_KEY || "web";
  const p = PILLARS[key] || PILLARS.web;
  React.useEffect(() => {
    document.title = `Quest Digital — ${p.name}`;
    const draw = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };
    draw(); const t = setTimeout(draw, 300); return () => clearTimeout(t);
  }, [key]);
  return (
    <div style={{ fontFamily: "var(--font-sans)" }}>
      <Header />
      <PillarHero p={p} />
      <Included p={p} />
      <Approach p={p} />
      <Pricing p={p} />
      <WhoFor p={p} />
      <TechBand p={p} />
      <WorkProof p={p} />
      <PairedWith p={p} />
      <FinalCTA p={p} />
      <Footer />
    </div>
  );
}
window.App = App;
