/* Quest Digital — About page sections */
const { A, TEAL, TEAL_HEX, INK, INK2, INK3, Reveal, Icon, Eyebrow, Header, Footer } = window;

function AboutHero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff", paddingTop: "160px", paddingBottom: "110px" }}>
      <div style={{ position: "absolute", top: "-30%", right: "-8%", width: "65vw", height: "65vw", background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-20%", left: "-12%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(43,123,185,0.2) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "0 40px" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "28px" }}>About Quest Digital</Eyebrow>
          <h1 style={{ margin: "0 0 26px", fontWeight: 700, fontSize: "clamp(36px, 5.2vw, 72px)", letterSpacing: "-0.025em", lineHeight: 1.04, maxWidth: "18ch" }}>
            We started as a creative agency that kept getting asked to build things.
          </h1>
          <p style={{ margin: 0, fontSize: "19px", fontWeight: 300, lineHeight: 1.65, color: "rgba(255,255,255,0.82)", maxWidth: "540px" }}>
            Over a decade later, that thinking still shapes everything we do.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function StorySection() {
  const stats = [
    { n: "10+", l: "Years of client work" },
    { n: "ISO\n27001", l: "Information security" },
    { n: "2", l: "Client tracks" },
    { n: "UK", l: "Based in Essex, working nationally" },
  ];
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "80px", alignItems: "start" }}>
          <Reveal>
            <Eyebrow style={{ marginBottom: "26px" }}>Our story</Eyebrow>
            <h2 style={{ margin: "0 0 28px", fontSize: "clamp(28px, 3.4vw, 44px)", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.12, color: "var(--quest-heading)" }}>Flow Media, now Quest Digital.</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 300, lineHeight: 1.7, color: "var(--quest-body)" }}>
                Quest Digital is the digital arm of Quest Group, formed through the acquisition of Flow Media — a full-service creative and digital agency based in Essex with over a decade of experience spanning brand, web, software and marketing.
              </p>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 300, lineHeight: 1.7, color: "var(--quest-body)" }}>
                That background makes us unusual. We are a proper creative agency with serious technical depth, backed by a group that builds and runs platforms supporting UK healthcare. We are not a freelance operation, and we are not a faceless corporate IT department.
              </p>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 300, lineHeight: 1.7, color: "var(--quest-body)" }}>
                We are a small, experienced team. Clients get direct access to the people actually doing the work — no account managers, no juniors handed a project on day two.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ position: "sticky", top: "120px" }}>
              <div style={{ borderRadius: "20px", overflow: "hidden", marginBottom: "24px", aspectRatio: "4/3", background: INK2 }}>
                <img src={`${A}/images/team-1.jpg`} alt="The Quest Digital team" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {stats.map((s) => (
                  <div key={s.l} style={{ background: "var(--quest-surface-alt)", border: "1px solid var(--quest-border)", borderRadius: "12px", padding: "20px 18px" }}>
                    <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em", color: INK, lineHeight: 1.1, whiteSpace: "pre-line" }}>{s.n}</div>
                    <div style={{ marginTop: "6px", fontSize: "12.5px", fontWeight: 500, color: "#6a7889", lineHeight: 1.4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HowWeWork() {
  const principles = [
    { icon: "users", title: "You talk to the people doing the work", body: "No account managers, no juniors handed your project on day two. A small, senior team means direct access and genuine accountability." },
    { icon: "git-branch", title: "We're honest about what fits", body: "If something is outside our scope, we say so upfront. If a project needs skills we don't have, we say that too. We'd rather lose a job than overpromise." },
    { icon: "infinity", title: "We're in it for the long term", body: "Our best client relationships have lasted years. We want to understand your business and become part of how it works — not just complete a brief and move on." },
  ];
  return (
    <section style={{ background: INK, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "22px" }}>How we work</Eyebrow>
          <h2 style={{ margin: "0 0 56px", fontSize: "clamp(30px, 3.8vw, 50px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.08 }}>Three things that define how we work with clients.</h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07}>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "36px 32px", height: "100%" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "12px", background: "rgba(42,179,192,0.15)", color: TEAL_HEX, marginBottom: "22px" }}>
                  <Icon name={p.icon} size={22} />
                </span>
                <h3 style={{ margin: "0 0 14px", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{p.title}</h3>
                <p style={{ margin: 0, fontSize: "15.5px", fontWeight: 300, lineHeight: 1.65, color: "rgba(255,255,255,0.78)" }}>{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function MeetTeam() {
  const TEAM = [
    { initials: "JS", name: "James Spencer", role: "Creative Director", bio: "Leads creative direction across brand, web and digital. Over a decade in the industry.", bg: INK },
    { initials: "LH", name: "Laura Hughes", role: "Lead Developer", bio: "Architects and builds complex platforms, portals and integrations from the ground up.", bg: "#1a3d6a" },
    { initials: "MR", name: "Matt Richards", role: "Head of Marketing", bio: "Drives SEO, paid media and content strategy for clients serious about growth.", bg: INK2 },
    { initials: "SC", name: "Sarah Chen", role: "Brand Designer", bio: "Identity, print and digital design. Makes things look as good as they work.", bg: "#0d2e50" },
  ];
  return (
    <section style={{ background: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <Reveal>
          <Eyebrow style={{ marginBottom: "22px" }}>The team</Eyebrow>
          <h2 style={{ margin: "0 0 14px", fontSize: "clamp(30px, 3.8vw, 50px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--quest-heading)" }}>Small, senior and direct.</h2>
          <p style={{ margin: "0 0 56px", fontSize: "18px", fontWeight: 300, color: "var(--quest-body)", maxWidth: "520px" }}>The people you talk to are the people doing the work.</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.07}>
              <div style={{ background: "#fff", border: "1px solid var(--quest-border)", borderRadius: "18px", padding: "34px 28px", transition: "box-shadow var(--dur) var(--ease), transform var(--dur) var(--ease)" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 14px 36px rgba(33,75,127,0.1)"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ width: "66px", height: "66px", borderRadius: "50%", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "22px" }}>
                  <span style={{ fontSize: "21px", fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>{m.initials}</span>
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--quest-heading)" }}>{m.name}</h3>
                <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: TEAL_HEX, marginBottom: "14px" }}>{m.role}</div>
                <p style={{ margin: 0, fontSize: "14.5px", fontWeight: 300, lineHeight: 1.6, color: "var(--quest-body)" }}>{m.bio}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Credentials() {
  return (
    <section style={{ background: "var(--quest-surface-alt)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
          <Reveal>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "60px", height: "60px", borderRadius: "14px", background: "rgba(42,179,192,0.12)", color: TEAL_HEX, marginBottom: "26px" }}>
              <Icon name="shield-check" size={28} />
            </div>
            <h2 style={{ margin: "0 0 20px", fontSize: "clamp(28px, 3.4vw, 44px)", fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.12, color: "var(--quest-heading)" }}>ISO 27001 certified.</h2>
            <p style={{ margin: "0 0 20px", fontSize: "17px", fontWeight: 300, lineHeight: 1.7, color: "var(--quest-body)" }}>
              We operate to an enterprise-grade information security standard. ISO 27001 is the internationally recognised benchmark for information security management — the same standard used by financial institutions, healthcare providers and government bodies.
            </p>
            <p style={{ margin: 0, fontSize: "17px", fontWeight: 300, lineHeight: 1.7, color: "var(--quest-body)" }}>
              For clients in regulated industries — healthcare, legal, finance — this is a genuine advantage, not just a box-tick. It means your data, your clients' data, and your platform are handled with the rigour those sectors require.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div style={{ background: INK, borderRadius: "20px", padding: "44px 40px", color: "#fff" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "28px", padding: "10px 16px", background: "rgba(42,179,192,0.15)", borderRadius: "999px", border: "1px solid rgba(42,179,192,0.3)" }}>
                <Icon name="building-2" size={18} color={TEAL_HEX} />
                <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEAL_HEX }}>Part of Quest Group</span>
              </div>
              <h3 style={{ margin: "0 0 16px", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>Backed by real infrastructure experience.</h3>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 300, lineHeight: 1.7, color: "rgba(255,255,255,0.78)" }}>
                Quest Digital is part of Quest Group — a UK-based group operating across healthcare infrastructure, logistics, engineering and technology. The group builds and runs the platforms supporting UK healthcare. That context shapes how we think about reliability, compliance and long-term partnerships.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function AboutCTA() {
  return (
    <section style={{ background: INK, color: "#fff" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "100px 40px", textAlign: "center" }}>
        <Reveal>
          <h2 style={{ margin: "0 0 18px", fontSize: "clamp(30px, 4vw, 54px)", fontWeight: 700, letterSpacing: "-0.02em" }}>Get to know us.</h2>
          <p style={{ margin: "0 0 36px", fontSize: "19px", fontWeight: 300, color: "rgba(255,255,255,0.78)", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
            Start with a conversation. No hard sell, no commitment required.
          </p>
          <a href="contact.html" style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", fontWeight: 600, color: INK, background: TEAL_HEX, padding: "18px 34px", borderRadius: "999px", textDecoration: "none", transition: "transform var(--dur) var(--ease)" }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
            Say hello <Icon name="arrow-right" size={18} />
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
      <AboutHero />
      <StorySection />
      <HowWeWork />
      <MeetTeam />
      <Credentials />
      <AboutCTA />
      <Footer />
    </div>
  );
}
window.App = App;
