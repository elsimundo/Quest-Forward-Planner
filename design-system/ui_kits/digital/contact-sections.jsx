/* Quest Digital — Contact page sections */
const { A, TEAL, TEAL_HEX, INK, INK2, INK3, NS, Reveal, Icon, Eyebrow, Header, Footer } = window;
const { Field, Input, Textarea } = NS;

const SERVICE_OPTIONS = [
  "Web, Software and Apps",
  "Hosting and Managed Services",
  "Marketing and Growth",
  "Brand and Design",
  "Not sure yet",
];

function ContactHero() {
  const [sent, setSent] = React.useState(false);
  const [services, setServices] = React.useState([]);
  const toggle = (s) => setServices((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  return (
    <section style={{ position: "relative", overflow: "hidden", background: INK, color: "#fff", minHeight: "100vh", paddingTop: "130px", paddingBottom: "100px" }}>
      <div style={{ position: "absolute", top: "-30%", right: "-8%", width: "65vw", height: "65vw", background: "radial-gradient(circle, rgba(42,179,192,0.16) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-20%", left: "-12%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(43,123,185,0.18) 0%, transparent 62%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: "80px", alignItems: "start" }}>

        {/* Left: info */}
        <Reveal>
          <Eyebrow onDark style={{ marginBottom: "26px" }}>Get in touch</Eyebrow>
          <h1 style={{ margin: "0 0 22px", fontWeight: 700, fontSize: "clamp(38px, 5vw, 68px)", letterSpacing: "-0.025em", lineHeight: 1.02 }}>Let&rsquo;s talk.</h1>
          <p style={{ margin: "0 0 40px", fontSize: "18px", fontWeight: 300, lineHeight: 1.7, color: "rgba(255,255,255,0.82)", maxWidth: "420px" }}>
            Whether you know exactly what you need or you&rsquo;re still figuring it out, we&rsquo;re happy to have a conversation. No hard sell, no jargon.
          </p>

          {/* paths */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "42px" }}>
            {[
              { icon: "briefcase", label: "I have a specific project in mind", sub: "Describe it in the form and we'll get back to you within one working day." },
              { icon: "compass", label: "I want to explore what's possible", sub: "Just say hello. We're happy to have an exploratory conversation." },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "18px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px" }}>
                <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", borderRadius: "9px", background: "rgba(42,179,192,0.18)", color: TEAL_HEX, marginTop: "1px" }}>
                  <Icon name={item.icon} size={18} />
                </span>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "5px" }}>{item.label}</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 300, color: "rgba(255,255,255,0.68)", lineHeight: 1.5 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* direct contact */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
            <a href="mailto:hello@questdesign.co.uk" style={{ display: "inline-flex", alignItems: "center", gap: "12px", fontSize: "16px", fontWeight: 500, color: "#fff", textDecoration: "none" }}>
              <Icon name="mail" size={18} color={TEAL_HEX} /> hello@questdesign.co.uk
            </a>
            <a href="tel:+441234000000" style={{ display: "inline-flex", alignItems: "center", gap: "12px", fontSize: "16px", fontWeight: 400, color: "rgba(255,255,255,0.78)", textDecoration: "none" }}>
              <Icon name="phone" size={18} color={TEAL_HEX} /> 01234 000000
            </a>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", fontSize: "13.5px", fontWeight: 400, color: "rgba(255,255,255,0.62)" }}>
            <Icon name="clock" size={15} color={TEAL_HEX} /> We aim to respond within one working day.
          </div>
        </Reveal>

        {/* Right: form */}
        <Reveal delay={0.12}>
          {sent ? (
            <div style={{ background: "rgba(42,179,192,0.1)", border: `1px solid ${TEAL_HEX}`, borderRadius: "24px", padding: "56px 40px", textAlign: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "50%", background: TEAL_HEX, marginBottom: "24px" }}>
                <Icon name="check" size={28} color={INK} />
              </span>
              <h2 style={{ margin: "0 0 14px", fontSize: "28px", fontWeight: 700 }}>Thank you.</h2>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 300, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>We&rsquo;ve got your message and will be in touch within one working day.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px", padding: "40px 36px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Field label="Name" onDark htmlFor="qdc-name"><Input id="qdc-name" onDark placeholder="Your name" required /></Field>
                <Field label="Email" onDark htmlFor="qdc-email"><Input id="qdc-email" type="email" onDark placeholder="you@company.co.uk" required /></Field>
              </div>
              <Field label="Company" onDark htmlFor="qdc-co">
                <Input id="qdc-co" onDark placeholder="Your company (optional)" />
              </Field>
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.72)", marginBottom: "12px", letterSpacing: "0.02em" }}>What are you interested in?</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {SERVICE_OPTIONS.map((s) => {
                    const on = services.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggle(s)}
                        style={{ fontSize: "13px", fontWeight: 500, padding: "9px 16px", borderRadius: "999px", border: `1.5px solid ${on ? TEAL_HEX : "rgba(255,255,255,0.26)"}`, background: on ? "rgba(42,179,192,0.18)" : "transparent", color: on ? "#fff" : "rgba(255,255,255,0.78)", cursor: "pointer", transition: "all var(--dur) var(--ease)" }}>
                        {on && <span style={{ marginRight: "6px", fontSize: "11px" }}>✓</span>}{s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Tell us about your project" onDark htmlFor="qdc-msg">
                <Textarea id="qdc-msg" onDark rows={4} placeholder="A few lines on what you're looking to do..." />
              </Field>
              <Field label="How did you hear about us?" onDark htmlFor="qdc-src">
                <div style={{ position: "relative" }}>
                  <select id="qdc-src" style={{ width: "100%", fontSize: "15px", fontWeight: 300, padding: "14px 18px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.88)", appearance: "none", cursor: "pointer", outline: "none" }}>
                    <option value="">Select an option</option>
                    {["Google","LinkedIn","Referral","Quest Group","Other"].map((o) => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: "18px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "rgba(255,255,255,0.5)" }}>
                    <Icon name="chevron-down" size={16} />
                  </span>
                </div>
              </Field>
              <button type="submit" style={{ marginTop: "4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize: "16px", fontWeight: 600, color: INK, background: TEAL_HEX, border: "none", padding: "18px 28px", borderRadius: "999px", cursor: "pointer", transition: "transform var(--dur) var(--ease)" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
                Send message <Icon name="arrow-right" size={18} />
              </button>
            </form>
          )}
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
      <ContactHero />
      <Footer />
    </div>
  );
}
window.App = App;
