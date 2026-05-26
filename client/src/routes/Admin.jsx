import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";
import ErrorState from "../components/ErrorState.jsx";
import BriefSkeleton from "../components/BriefSkeleton.jsx";

/**
 * Wave N+ — Admin dashboard.
 * /admin route. Gated by ADMIN_EMAILS env var on the server (returns 403 if you're not on the list).
 * Renders: today's cost, daily totals chart, top spenders, A/B variant scores, recent brief scores,
 * founder-note composer.
 *
 * Everything goes through the same `/api/admin/*` endpoints from server/routes/admin.js.
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

async function adminFetch(path) {
  const r = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (r.status === 403) throw new Error("Not an admin. Set ADMIN_EMAILS on the server.");
  if (r.status === 401) throw new Error("Not signed in. /login first.");
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function formatUsd(microUsd) {
  const dollars = Number(microUsd || 0) / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

export default function Admin() {
  const [tab, setTab] = useState("cost");
  return (
    <>
      <PageMeta title="Editor's desk · admin" description="Dispatch admin dashboard." />
      <Masthead subscript="Editor's desk · admin" />
      <main id="main" className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="eyebrow mb-1">Editor's desk</p>
            <h2 className="font-display text-3xl text-paper">Dispatch admin</h2>
          </div>
          <p className="kicker">
            Sentry · PostHog · Resend logs live in their own dashboards.{" "}
            <Link to="/" className="text-gold">← Back to site</Link>
          </p>
        </div>

        <nav className="flex items-center gap-1 mb-8 border-b border-rule overflow-x-auto" role="tablist">
          {[
            ["cost", "Cost"],
            ["ab", "A/B variants"],
            ["scores", "Brief scores"],
            ["note", "Founder note"],
          ].map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`admin-tab ${tab === k ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "cost" && <CostTab />}
        {tab === "ab" && <ABTab />}
        {tab === "scores" && <ScoresTab />}
        {tab === "note" && <FounderNoteTab />}
      </main>
    </>
  );
}

function useAdminEndpoint(path) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminFetch(path)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return { data, err, loading };
}

function CostTab() {
  const { data, err, loading } = useAdminEndpoint("/api/admin/cost?days=14");
  if (loading) return <BriefSkeleton tag="Fetching cost data" lines={3} />;
  if (err) return <ErrorState error={err} title="Couldn't load cost data" />;

  const today = data.today_usd ?? 0;
  const daily = data.daily || [];
  const maxDaily = Math.max(1, ...daily.map((r) => Number(r.cost_micro_usd) / 1_000_000));

  return (
    <div>
      <section className="mb-10">
        <p className="kicker mb-3">Today</p>
        <p className="font-display text-5xl text-gold leading-none mb-2">${today.toFixed(2)}</p>
        <p className="font-serif-body text-paper-dim italic">
          OpenAI spend so far today (UTC). Alert fires at the COST_ALERT_THRESHOLD_USD value.
        </p>
      </section>

      <section className="mb-10">
        <p className="kicker mb-3">Daily spend, last {data.days} days</p>
        <div className="admin-bar-chart">
          {daily.slice().reverse().map((r) => {
            const usd = Number(r.cost_micro_usd) / 1_000_000;
            const pct = Math.max(2, (usd / maxDaily) * 100);
            return (
              <div key={r.day} className="admin-bar-row" title={`${r.day}: $${usd.toFixed(2)} · ${r.calls} calls`}>
                <span className="admin-bar-label">{r.day.slice(5)}</span>
                <div className="admin-bar-track">
                  <div className="admin-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="admin-bar-value">${usd.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <p className="kicker mb-3">Breakdown by endpoint</p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Model</th>
              <th>Calls</th>
              <th>Tokens</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {(data.by_endpoint || []).map((r, i) => (
              <tr key={i}>
                <td>{r.endpoint}</td>
                <td className="font-mono text-xs">{r.model}</td>
                <td>{r.calls}</td>
                <td>{Number(r.tokens || 0).toLocaleString()}</td>
                <td className="text-gold">{formatUsd(r.cost_micro_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <p className="kicker mb-3">Top spenders, last {data.days} days</p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Calls</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {(data.top_spenders || []).map((r, i) => (
              <tr key={i}>
                <td>{r.email || <em className="text-muted">(anonymous)</em>}</td>
                <td>{r.calls}</td>
                <td className="text-gold">{formatUsd(r.cost_micro_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ABTab() {
  const { data, err, loading } = useAdminEndpoint("/api/admin/ab-results?days=14");
  if (loading) return <BriefSkeleton tag="Loading A/B results" lines={2} />;
  if (err) return <ErrorState error={err} title="Couldn't load A/B results" />;
  const variants = data.variants || [];
  if (!variants.length) {
    return (
      <p className="font-serif-body italic text-paper-dim text-center py-10">
        No A/B results yet. Variants only register once briefs have been scored by the LLM judge.
      </p>
    );
  }

  return (
    <div>
      <p className="kicker mb-3">Variant scores, last {data.days} days</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Variant</th>
            <th>Scored briefs</th>
            <th>Avg overall</th>
            <th>Coherence</th>
            <th>Career-rel.</th>
            <th>Voice</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v, i) => (
            <tr key={i}>
              <td className="font-mono text-xs">{v.variant_id || "(default)"}</td>
              <td>{v.n_scored}</td>
              <td className="text-gold font-display text-lg">{Number(v.avg_overall || 0).toFixed(2)}</td>
              <td>{Number(v.avg_coherence || 0).toFixed(2)}</td>
              <td>{Number(v.avg_career_relevance || 0).toFixed(2)}</td>
              <td>{Number(v.avg_voice_fidelity || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-serif-body italic text-muted text-sm mt-4">
        Don't switch the default variant based on fewer than 100 scored briefs per variant. Statistical noise wins below that threshold.
      </p>
    </div>
  );
}

function ScoresTab() {
  const { data, err, loading } = useAdminEndpoint("/api/admin/scores?limit=50");
  if (loading) return <BriefSkeleton tag="Loading recent scores" lines={2} />;
  if (err) return <ErrorState error={err} title="Couldn't load scores" />;
  const scores = data.scores || [];
  if (!scores.length) {
    return (
      <p className="font-serif-body italic text-paper-dim text-center py-10">
        No brief scores yet. Scoring runs async after each brief generation.
      </p>
    );
  }
  return (
    <div>
      <p className="kicker mb-3">Recent brief scores (newest first)</p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Slug / req</th>
            <th>Variant</th>
            <th>Overall</th>
            <th>Coh.</th>
            <th>Career</th>
            <th>Voice</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.edition_slug || s.request_id}>
              <td className="text-xs text-muted">{new Date(s.created_at).toLocaleString()}</td>
              <td className="font-mono text-xs">{s.edition_slug || s.request_id?.slice(0, 8) || "—"}</td>
              <td className="font-mono text-xs">{s.variant_id || "default"}</td>
              <td className="text-gold font-display">{s.overall}</td>
              <td>{s.coherence}</td>
              <td>{s.career_relevance}</td>
              <td>{s.voice_fidelity}</td>
              <td className="text-xs italic text-paper-dim max-w-xs truncate">{s.notes || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FounderNoteTab() {
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [notes, setNotes] = useState([]);

  const load = async () => {
    try {
      const d = await adminFetch("/api/admin/founder-note");
      setNotes(d.notes || []);
    } catch (e) {
      setErr(e);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/founder-note`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), audience }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "post failed");
      setBody("");
      await load();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    await fetch(`${API_BASE}/api/admin/founder-note/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  };

  return (
    <div>
      <p className="kicker mb-3">Write a founder note</p>
      <p className="font-serif-body text-paper-dim text-sm leading-relaxed mb-4 max-w-xl">
        Renders atop today's brief for {audience === "all" ? "every subscriber" : "you only (test mode)"}.
        Max 400 chars. Use sparingly — when there's something specific to say alongside the AI brief.
      </p>
      <form onSubmit={submit} className="mb-10">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 400))}
          rows={4}
          maxLength={400}
          className="email-input w-full mb-3"
          placeholder="Heads up — tomorrow's brief includes a one-off feature on the Anthropic launch. Read closely."
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="all" checked={audience === "all"} onChange={(e) => setAudience(e.target.value)} />
              <span className="font-serif-body text-sm">All subscribers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="self" checked={audience === "self"} onChange={(e) => setAudience(e.target.value)} />
              <span className="font-serif-body text-sm">Just me (test)</span>
            </label>
            <span className="text-muted text-xs">{body.length}/400</span>
          </div>
          <button className="btn-primary" disabled={busy || !body.trim()}>
            {busy ? "Posting…" : "Post note"}
          </button>
        </div>
        {err && <p className="text-red-400 text-sm font-mono mt-3">{String(err.message)}</p>}
      </form>

      <p className="kicker mb-3">Active notes</p>
      {notes.length === 0 ? (
        <p className="font-serif-body italic text-paper-dim">No active founder notes.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="border border-rule p-4 rounded-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="kicker">{n.audience === "self" ? "TEST" : "ALL"} · {new Date(n.created_at).toLocaleDateString()}</p>
                <button onClick={() => remove(n.id)} className="text-xs text-muted hover:text-red-400">delete</button>
              </div>
              <p className="font-serif-body text-paper leading-relaxed">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
