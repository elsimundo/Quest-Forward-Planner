/* Quest Digital — Services page sections */
const { A, TEAL, TEAL_HEX, INK, INK2, INK3, Reveal, Icon, Eyebrow, Header, Footer } = window;

/* ── shared mini-link ── */
function ArrowLink({ children, href = "#", dark = false }) {
  const [h, setH] = React.useState(false);
  return (
    <a href={href} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "15px", fontWeight: 600,
        color: dark ? "#fff" : "var(--quest-heading)", textDecoration: "none" }}>
      {children}
      <span style={{ color: TEAL_HEX, transform: h ? "translateX(6px)" : "translateX(0)", transition: "transform 0.4s var(--ease)" }}>→</span>
    </a>
  );
}

/* ── Hero ── */
function ServiceHero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff", paddingTop: "160px", paddingBottom: "110px" }}>
      <div style={{ position: "absolute", top: "-30%", right: "-10%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(42,179,192,0.18) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-20%", left: "-14%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(43,123,185,0.22) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "28px" }}>What we do</Eyebrow>
          <h1 style={{ margin: "0 0 24px", fontWeight: 700, fontSize: "clamp(44px, 6vw, 82px)", letterSpacing: "-0.025em", lineHeight: 1.0, maxWidth: "14ch" }}>Four pillars. One studio.</h1>
          <p style={{ margin: "0 0 36px", fontSize: "20px", fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.82)", maxWidth: "560px" }}>
            Brand, build, hosting and marketing under one roof. No handoffs, no gaps.
            Most clients come to us for one thing and stay for all four.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            {[["Web, Software and Apps","#web"],["Hosting","#hosting"],["Marketing","#marketing"],["Brand","#brand"]].map(([l,h]) => (
              <a key={l} href={h} style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.28)", padding: "9px 18px", borderRadius: "999px", textDecoration: "none", transition: "background var(--dur) var(--ease), border-color var(--dur) var(--ease)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)"; }}>{l}</a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Single pillar row — full-width band, alternating tint, consistent rhythm ── */
function PillarRow({ id, n, icon, title, desc, features, tech, tint, primary, href }) {
  const [h, setH] = React.useState(false);
  return (
    <section id={id} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: tint ? "var(--quest-surface-alt)" : "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "76px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 360px", gap: "56px", alignItems: "start" }}>
          {/* index + icon */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.1em", color: TEAL_HEX }}>{n}</span>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "12px", background: h ? TEAL : "rgba(42,179,192,0.12)", color: h ? INK : TEAL_HEX, transition: "background var(--dur) var(--ease), color var(--dur) var(--ease)" }}>
              <Icon name={icon} size={22} />
            </span>
          </div>
          {/* title + desc + link */}
          <div>
            {primary && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEAL_HEX, background: "rgba(42,179,192,0.12)", padding: "5px 12px", borderRadius: "999px", marginBottom: "16px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: TEAL_HEX }}></span>
                Primary capability
              </span>
            )}
            <h2 style={{ margin: "0 0 16px", fontSize: "30px", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.12, color: "var(--quest-heading)" }}>{title}</h2>
            <p style={{ margin: "0 0 26px", fontSize: "17px", fontWeight: 300, lineHeight: 1.65, color: "var(--quest-body)", maxWidth: "520px" }}>{desc}</p>
            <ArrowLink href={href}>Explore {title}</ArrowLink>
          </div>
          {/* features + tech */}
          <div style={{ paddingTop: "4px" }}>
            <ul style={{ listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: "11px" }}>
              {features.map((f) => (
                <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "11px", fontSize: "15px", fontWeight: 400, color: "var(--quest-body)", lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0, marginTop: "3px", color: TEAL_HEX }}><Icon name="check" size={15} /></span>
                  {f}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {tech.map((t) => (
                <span key={t} style={{ fontSize: "12.5px", fontWeight: 600, letterSpacing: "0.04em", color: INK, background: "rgba(42,179,192,0.16)", padding: "6px 13px", borderRadius: "999px" }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PILLARS = [
  { id: "web", n: "01", icon: "code-2", title: "Web, Software and Apps", flip: false, href: "service-web.html",
    desc: "Our primary capability. We design and build digital products that perform — from large enterprise platforms to fast, lightweight sites for small businesses. We choose the right technology, not the easiest one.",
    features: ["Bespoke web applications and internal systems", "Client portals and multi-user platforms", "E-commerce for complex or high-volume operations", "Mobile applications (iOS and Android via Flutter)", "API integrations and third-party connectivity", "Legacy system modernisation"],
    tech: ["Next.js", "React", "Ruby on Rails", ".NET", "PHP", "WordPress", "Flutter"] },
  { id: "hosting", n: "02", icon: "server", title: "Hosting and Managed Services", flip: true, href: "service-hosting.html",
    desc: "We don't build things and disappear. Fully managed hosting means we own the uptime, the security, the maintenance and the support. For clients who also use us for build or marketing, everything sits under one roof.",
    features: ["Managed web hosting and domain management", "SSL certificate management and security monitoring", "Regular backups and disaster recovery", "CMS maintenance and platform updates", "Technical support and incident response", "Performance monitoring and SLA options"],
    tech: ["Docker", "Coolify", "Vercel", "ISO 27001 infra"] },
  { id: "marketing", n: "03", icon: "trending-up", title: "Marketing and Growth", flip: false, href: "service-marketing.html",
    desc: "A great website is the start, not the finish. We handle the ongoing work of digital marketing — the SEO, the paid campaigns, the social presence, the email flows. Performance-led, not vanity-led.",
    features: ["Search engine optimisation (SEO): technical, on-page, off-page", "Google Ads and paid search (PPC)", "Paid social advertising", "Social media management and content", "Email marketing strategy, design and automation", "Analytics setup, reporting and content strategy"],
    tech: ["Google Ads", "SEO", "Paid Social", "Email", "Analytics"] },
  { id: "brand", n: "04", icon: "palette", title: "Brand and Design", flip: true, href: "service-brand.html",
    desc: "Great digital work starts with a clear visual identity. We offer brand as a supporting capability — because a software or web project often needs it, and we're good at it. Clients should not need to go elsewhere for it.",
    features: ["Logo design and full visual identity", "Brand guidelines and style documentation", "Brand refresh and evolution projects", "Print design: brochures, stationery, signage", "Marketing collateral and campaign assets", "Presentation templates"],
    tech: ["Figma", "Adobe CC", "Print production"] },
];

function PillarsDeep() {
  return (
    <div>
      {PILLARS.map((p, i) => (
        <Reveal key={p.id} delay={0}>
          <PillarRow {...p} tint={i % 2 === 1} primary={i === 0} />
        </Reveal>
      ))}
    </div>
  );
}

/* ── Right tool section ── */
function RightTool() {
  const cats = [
    { label: "Modern web", items: ["Next.js", "React", "Tailwind"] },
    { label: "Established platforms", items: ["WordPress", "PHP", ".NET"] },
    { label: "Application dev", items: ["Ruby on Rails", "Node.js", "REST APIs"] },
    { label: "Mobile", items: ["Flutter", "Dart", "iOS / Android"] },
    { label: "Infrastructure", items: ["Docker", "Coolify", "Vercel"] },
    { label: "Content and payments", items: ["Payload CMS", "Stripe", "Xero"] },
  ];
  return (
    <section style={{ background: INK, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "22px" }}>Technology</Eyebrow>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "40px", flexWrap: "wrap", marginBottom: "56px" }}>
            <h2 style={{ margin: 0, fontSize: "clamp(32px, 4.2vw, 54px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08 }}>We use what&rsquo;s right for the job, not what&rsquo;s familiar.</h2>
            <p style={{ margin: 0, fontSize: "17px", fontWeight: 300, lineHeight: 1.65, color: "rgba(255,255,255,0.78)", maxWidth: "380px" }}>
              Genuine in-house experience across a wide range of technologies. We make informed recommendations, not comfortable ones.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {cats.map((c) => (
              <div key={c.label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "26px 28px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "14px" }}>{c.label}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {c.items.map((it) => (
                    <span key={it} style={{ fontSize: "16px", fontWeight: 400, color: "rgba(255,255,255,0.9)" }}>{it}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Two tracks callout ── */
function TracksCallout() {
  return (
    <section style={{ background: "var(--quest-surface-alt)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow style={{ marginBottom: "22px" }}>Two client tracks</Eyebrow>
          <h2 style={{ margin: "0 0 14px", fontSize: "clamp(32px, 4.2vw, 52px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--quest-heading)" }}>Which best describes you?</h2>
          <p style={{ margin: "0 0 52px", fontSize: "18px", fontWeight: 300, color: "var(--quest-body)" }}>Different scales, the same level of care.</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "22px" }}>
          {[
            { title: "Enterprise and complex platforms", sub: "Bespoke software, portals, integrations and compliance-grade infrastructure for large organisations.", href: "enterprise.html", dark: true },
            { title: "Small business", sub: "Fast, properly engineered sites with booking, stock and portals built in. You don't have to be large to get enterprise quality.", href: "small-business.html", dark: false },
          ].map((t) => (
            <Reveal key={t.title} delay={0.06}>
              <a href={t.href} style={{ display: "block", padding: "40px 38px", borderRadius: "18px", background: t.dark ? INK : "#fff", border: t.dark ? "none" : "2px solid var(--quest-border)", textDecoration: "none", transition: "transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = t.dark ? "0 24px 48px rgba(14,36,64,0.28)" : "0 14px 36px rgba(33,75,127,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "16px" }}>{t.title}</div>
                <p style={{ margin: "0 0 28px", fontSize: "17px", fontWeight: 300, lineHeight: 1.6, color: t.dark ? "rgba(255,255,255,0.82)" : "var(--quest-body)" }}>{t.sub}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600, color: t.dark ? "#fff" : INK }}>Find out more <span style={{ color: TEAL_HEX }}>→</span></span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ── */
function ServiceCTA() {
  return (
    <section style={{ background: INK, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "32px" }}>
        <Reveal>
          <h2 style={{ margin: 0, fontSize: "clamp(28px, 3.6vw, 48px)", fontWeight: 700, letterSpacing: "-0.02em" }}>Not sure where to start?<br />We can help you figure it out.</h2>
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
      <ServiceHero />
      <PillarsDeep />
      <RightTool />
      <TracksCallout />
      <ServiceCTA />
      <Footer />
    </div>
  );
}
window.App = App;
