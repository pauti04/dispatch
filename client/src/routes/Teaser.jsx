import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { IS_STATIC_ONLY } from "../lib/api.js";

// Static publication definitions for the teasers. Each one lives at its own route.
const PUBLICATIONS = {
  finance: {
    name: "Dispatch · Finance",
    tagline:
      "A daily career-intelligence brief for working developers in fintech, quant, and the markets. AI-curated from SEC filings, market wires, and HN-finance.",
    sources_blurb: "SEC EDGAR, Yahoo Finance, FRED economic data, Hacker News finance threads",
    palette_class: "teaser-finance",
  },
  design: {
    name: "Dispatch · Design",
    tagline:
      "A daily brief for working product designers — design systems, UX research, tools, and the open-source design ecosystem.",
    sources_blurb: "Designer News, Mobbin, GitHub design-system trending, Product Hunt",
    palette_class: "teaser-design",
  },
  "ai-research": {
    name: "Dispatch · AI Research",
    tagline:
      "A daily brief for researchers and applied scientists. arXiv first, then the meta-conversation in HackerNews and Twitter, with career framing.",
    sources_blurb: "arXiv (cs.LG, cs.CL, cs.AI), HN AI threads, GitHub AI-org trending, Hugging Face spaces",
    palette_class: "teaser-airesearch",
  },
  "cybersecurity-weekly": {
    name: "Dispatch · Security Weekly",
    tagline:
      "A weekly long-read for working security professionals. CVE deep-dives, AppSec, offensive research, and incident retrospectives.",
    sources_blurb: "NVD, KrebsOnSecurity, security mailing lists, Project Zero blog, HN security threads",
    palette_class: "teaser-security",
  },
};

export default function Teaser({ publicationId }) {
  const pub = PUBLICATIONS[publicationId];
  if (IS_STATIC_ONLY) {
    return (
      <DemoModeNotice
        feature={pub ? `The ${pub.name} interest list` : "This publication teaser"}
        subscript={pub ? `${pub.name} · demo mode` : "Teaser · demo mode"}
      />
    );
  }
  const [email, setEmail] = useState("");
  const [count, setCount] = useState(null);
  const [status, setStatus] = useState(null); // 'sending' | 'subscribed' | error
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/interest/count/${publicationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCount(d?.count ?? 0))
      .catch(() => {});
  }, [publicationId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setError(null);
    try {
      const r = await fetch("/api/interest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publication_id: publicationId, email, source: `/${publicationId}` }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      setStatus("subscribed");
      setCount(data.count);
    } catch (err) {
      setStatus(null);
      setError(String(err.message || err));
    }
  };

  if (!pub) {
    return (
      <>
        <Masthead subscript="Section not found" />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="font-serif-body text-paper-dim italic">
            We're not running a section by that name yet. <Link to="/" className="text-gold">Back to Dispatch.</Link>
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={`${pub.name} · coming soon`}
        description={pub.tagline}
      />
      <Masthead subscript="Coming soon · join the list" />

      <main className={`max-w-3xl mx-auto px-6 py-16 ${pub.palette_class}`}>
        <div className="text-center">
          <p className="eyebrow mb-5">Upcoming section</p>
          <h2 className="font-display text-5xl md:text-6xl text-paper leading-[1.05] mb-6">
            {pub.name}
          </h2>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed max-w-xl mx-auto mb-3">
            {pub.tagline}
          </p>
          <p className="kicker mt-6 mb-10">Sourced from: {pub.sources_blurb}</p>
        </div>

        <hr className="rule-gold mb-10" />

        {status === "subscribed" ? (
          <div className="card p-8 text-center max-w-xl mx-auto">
            <p className="eyebrow mb-3">You're on the list</p>
            <h3 className="font-display text-2xl text-paper mb-3">We'll write when it ships.</h3>
            <p className="font-serif-body text-paper-dim leading-relaxed">
              You're number <strong className="text-paper">{count}</strong>. We won't email you for
              anything else.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="max-w-xl mx-auto">
            <p className="font-serif-body text-paper-dim text-center mb-5">
              We're prototyping {pub.name}. Drop your email and we'll write when the first edition
              is ready. No commitment, no other email until then.
            </p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="email-input flex-1"
              />
              <button
                className="btn-primary"
                disabled={status === "sending" || !email}
                type="submit"
              >
                {status === "sending" ? "Sending…" : "Notify me"}
              </button>
            </div>
            {error && (
              <p className="text-center text-red-400 text-sm font-mono mt-3">{error}</p>
            )}
            {count != null && (
              <p className="text-center text-muted text-sm mt-5 italic">
                {count} {count === 1 ? "person is" : "people are"} already on the list.
              </p>
            )}
          </form>
        )}

        <div className="text-center mt-16">
          <Link to="/" className="kicker">
            ← Back to Dispatch
          </Link>
        </div>
      </main>
    </>
  );
}
