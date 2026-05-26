import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { ROLES, SKILL_LEVELS, DOMAINS, roleLabel, skillLabel } from "../topics.js";
import { api, IS_STATIC_ONLY } from "../lib/api.js";

const TZ_DEFAULTS = ["UTC", "America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function Account() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="Your account" subscript="Account · demo mode" />;
  }
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isWelcome = params.get("welcome") === "1";

  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");
  const [error, setError] = useState(null);
  const [testSendStatus, setTestSendStatus] = useState(null);

  const load = async () => {
    try {
      const d = await api.me();
      setData(d);
    } catch (err) {
      if (err.status === 401) navigate("/login", { replace: true });
      else setError(String(err.message || err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <>
        <Masthead subscript="Trouble loading your account" />
        <main className="max-w-xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words">{error}</p>
        </main>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <Masthead subscript="Loading your account…" />
        <main className="max-w-xl mx-auto px-6 py-16 text-center">
          <p className="font-serif-body text-paper-dim italic">Just a moment…</p>
        </main>
      </>
    );
  }

  const { user, prefs } = data;
  // Prefs still uses 'topics' as the storage key in the DB; treat it as the user's domain list.
  const domains = new Set(prefs?.topics || []);
  const excludeTopics = new Set(prefs?.exclude_topics || []);
  const weights = prefs?.topic_weights || {};
  const depth = prefs?.depth || "standard";
  const sendDays = new Set(user.send_days || []);
  const role = user.role || prefs?.role || "software_engineer";
  const skillLevelValue = user.skill_level || prefs?.skill_level || "intermediate";
  const pausedUntil = user.paused_until || null;
  const onVacation = !!(pausedUntil && new Date(pausedUntil) > new Date());

  const update = async (patch) => {
    setSaving(true);
    try {
      const updated = await api.updateMe(patch);
      setData(updated);
      setSavedFlash("Saved");
      setTimeout(() => setSavedFlash(""), 1400);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const toggleDomain = (t) => {
    const next = new Set(domains);
    next.has(t) ? next.delete(t) : next.add(t);
    update({ topics: [...next] });
  };
  const toggleDay = (d) => {
    const next = new Set(sendDays);
    next.has(d) ? next.delete(d) : next.add(d);
    update({ send_days: [...next] });
  };

  const onSignOut = async () => {
    await api.authLogout();
    navigate("/", { replace: true });
  };
  const onDelete = async () => {
    if (!confirm("Delete your account and all editions? This cannot be undone.")) return;
    await api.deleteMe();
    navigate("/", { replace: true });
  };
  const onTestSend = async () => {
    setTestSendStatus("sending");
    try {
      await api.testSend();
      setTestSendStatus("sent");
      setTimeout(() => setTestSendStatus(null), 4000);
    } catch (err) {
      setTestSendStatus(`error: ${err.message || err}`);
    }
  };

  return (
    <>
      <Masthead
        subscript={user.status === "active" ? "Subscription active" : `Subscription ${user.status}`}
        leftLine={user.email}
      />

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <div className="account-subnav">
          <Link to="/archive" className="account-subnav-link">
            <span className="kicker">Back issues</span>
            <span className="font-display text-xl">The archive →</span>
          </Link>
          <Link to="/saved" className="account-subnav-link">
            <span className="kicker">Your clippings</span>
            <span className="font-display text-xl">Saved stories →</span>
          </Link>
        </div>

        {isWelcome && (
          <div className="card p-6 border-gold/40">
            <p className="eyebrow mb-2">Welcome aboard</p>
            <h2 className="font-display text-2xl text-paper mb-2">Your subscription is set.</h2>
            <p className="font-serif-body text-paper-dim leading-relaxed">
              Your first edition arrives tomorrow at {user.send_time} local. Tweak anything below.
            </p>
          </div>
        )}

        <section>
          <p className="eyebrow mb-3">Role</p>
          <p className="font-serif-body text-paper-dim text-sm italic mb-3">
            We tune the brief to your role's career arc.
          </p>
          <select
            value={role}
            onChange={(e) => update({ role: e.target.value })}
            className="select-input w-full max-w-md"
            disabled={saving}
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </section>

        <section>
          <p className="eyebrow mb-3">Skill level</p>
          <div className="depth-strip flex-wrap">
            {SKILL_LEVELS.map((s) => (
              <button
                key={s.id}
                disabled={saving}
                onClick={() => update({ skill_level: s.id })}
                className={skillLevelValue === s.id ? "active" : ""}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <p className="eyebrow">Beats — career domains</p>
            <p className="kicker">{domains.size} selected</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[...new Set([...DOMAINS, ...domains])].map((d) => (
              <button
                key={d}
                disabled={saving}
                onClick={() => toggleDomain(d)}
                className={`chip ${domains.has(d) ? "active" : ""}`}
              >
                {d}
              </button>
            ))}
          </div>
          <CustomTopicInput
            onAdd={(t) => update({ topics: [...new Set([...domains, t])] })}
            disabled={saving}
          />
        </section>

        {domains.size > 0 && (
          <section>
            <p className="eyebrow mb-3">Beat weights — 1 (low) to 5 (high)</p>
            <p className="font-serif-body text-paper-dim text-sm italic mb-3">
              The editor uses these as soft priorities when picking + ordering stories.
            </p>
            <div>
              {[...domains].map((d) => (
                <div className="beat-weight-row" key={d}>
                  <span className="beat-weight-label">{d}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={weights[d] ?? 3}
                      onChange={(e) =>
                        update({
                          topic_weights: { ...weights, [d]: parseInt(e.target.value, 10) },
                        })
                      }
                      disabled={saving}
                    />
                    <span className="beat-weight-value">{weights[d] ?? 3}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="eyebrow mb-3">Never show me…</p>
          <p className="font-serif-body text-paper-dim text-sm italic mb-3">
            Topics the editor will skip entirely. Useful for filtering out hype categories
            you've heard enough about.
          </p>
          <ExcludeTopicsInput
            excluded={excludeTopics}
            onAdd={(t) => update({ exclude_topics: [...new Set([...excludeTopics, t])] })}
            onRemove={(t) => {
              const next = new Set(excludeTopics);
              next.delete(t);
              update({ exclude_topics: [...next] });
            }}
            disabled={saving}
          />
        </section>

        <section>
          <p className="eyebrow mb-3">Length of read</p>
          <div className="depth-strip">
            {["skim", "standard", "deep"].map((d) => (
              <button
                key={d}
                disabled={saving}
                onClick={() => update({ depth: d })}
                className={depth === d ? "active" : ""}
              >
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow mb-3">Delivery schedule</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {DAY_KEYS.map((d) => (
              <button
                key={d}
                disabled={saving}
                onClick={() => toggleDay(d)}
                className={`chip ${sendDays.has(d) ? "active" : ""}`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <label className="kicker">Time (local)</label>
            <input
              type="time"
              value={(user.send_time || "08:00").slice(0, 5)}
              onChange={(e) => update({ send_time: e.target.value })}
              className="time-input"
            />
            <label className="kicker">Timezone</label>
            <select
              value={user.timezone}
              onChange={(e) => update({ timezone: e.target.value })}
              className="select-input"
            >
              {[...new Set([user.timezone, ...TZ_DEFAULTS])].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-3">Vacation mode</p>
          {onVacation ? (
            <div className="card p-4 border-gold/40 flex items-center justify-between gap-3 flex-wrap">
              <p className="font-serif-body text-paper-dim italic">
                Paused until{" "}
                <strong className="not-italic text-paper">
                  {new Date(pausedUntil).toLocaleString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                  })}
                </strong>
                . The brief resumes after that.
              </p>
              <button
                className="btn-ghost"
                disabled={saving}
                onClick={() => update({ paused_until: null })}
              >
                Resume now
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <label className="kicker">Pause delivery until</label>
              <input
                type="date"
                className="time-input"
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  // Resume at 06:00 local on the chosen date
                  const iso = new Date(e.target.value + "T06:00:00").toISOString();
                  update({ paused_until: iso });
                }}
                disabled={saving}
              />
              <p className="kicker">Daily emails skip until that date.</p>
            </div>
          )}
        </section>

        <section>
          <p className="eyebrow mb-3">Status</p>
          <div className="depth-strip">
            <button
              disabled={saving}
              onClick={() => update({ status: "active" })}
              className={user.status === "active" ? "active" : ""}
            >
              Active
            </button>
            <button
              disabled={saving}
              onClick={() => update({ status: "paused" })}
              className={user.status === "paused" ? "active" : ""}
            >
              Paused
            </button>
          </div>
        </section>

        <hr className="rule" />

        <InviteCard />

        <RSSCard token={user.unsubscribe_token} />

        <hr className="rule" />

        <section className="flex items-center gap-3 flex-wrap">
          <button className="btn-ghost" onClick={onTestSend} disabled={testSendStatus === "sending"}>
            {testSendStatus === "sending" ? "Sending…" : "Send me a test edition now"}
          </button>
          {testSendStatus === "sent" && <span className="kicker">✓ Sent — check your inbox</span>}
          {testSendStatus && testSendStatus.startsWith("error") && (
            <span className="kicker text-red-400">{testSendStatus}</span>
          )}
          <span className="flex-1" />
          <button className="btn-ghost" onClick={onSignOut}>
            Sign out
          </button>
          <button className="btn-ghost text-red-300 border-red-400/30" onClick={onDelete}>
            Delete account
          </button>
        </section>

        {savedFlash && <p className="kicker text-center">{savedFlash}</p>}
      </main>
    </>
  );
}

/* ─── Custom topic input ────────────────────────────────────── */
function CustomTopicInput({ onAdd, disabled }) {
  const [value, setValue] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const t = value.trim().replace(/\s+/g, " ").slice(0, 48);
    if (!t) return;
    onAdd(t);
    setValue("");
  };
  return (
    <form onSubmit={submit} className="flex gap-2 max-w-md">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add your own beat (e.g. Postgres, RAG)"
        className="email-input flex-1"
        maxLength={48}
        disabled={disabled}
      />
      <button type="submit" className="btn-ghost" disabled={disabled || !value.trim()}>
        + Add
      </button>
    </form>
  );
}

/* ─── Exclude topics input ──────────────────────────────────── */
function ExcludeTopicsInput({ excluded, onAdd, onRemove, disabled }) {
  const [value, setValue] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const t = value.trim().replace(/\s+/g, " ").slice(0, 48);
    if (!t) return;
    onAdd(t);
    setValue("");
  };
  return (
    <div>
      <form onSubmit={submit} className="flex gap-2 max-w-md mb-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. crypto, blockchain, web3"
          className="email-input flex-1"
          maxLength={48}
          disabled={disabled}
        />
        <button type="submit" className="btn-ghost" disabled={disabled || !value.trim()}>
          Exclude
        </button>
      </form>
      {excluded.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {[...excluded].map((t) => (
            <button
              key={t}
              onClick={() => onRemove(t)}
              className="chip chip-exclude"
              title="Click to un-exclude"
              disabled={disabled}
            >
              × {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Invite card ───────────────────────────────────────────── */
function InviteCard() {
  const [invite, setInvite] = useState(null);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    api
      .myInvite()
      .then(setInvite)
      .catch(() => {});
  }, []);

  const link = invite?.token
    ? `${window.location.origin}/i/${invite.token}`
    : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setFlash("Copied");
      setTimeout(() => setFlash(""), 1800);
    } catch {
      setFlash("Couldn't copy");
    }
  };

  return (
    <section className="invite-card">
      <p className="eyebrow mb-2">Invite a colleague</p>
      <h3 className="font-display text-2xl text-paper mb-2">Send Dispatch to someone you respect.</h3>
      <p className="font-serif-body text-paper-dim mb-4">
        Share your personal link. We'll let you know when someone subscribes through it.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          readOnly
          value={link || "Generating link…"}
          className="email-input font-mono text-xs flex-1"
          onFocus={(e) => e.target.select()}
        />
        <button className="btn-primary" onClick={copy} disabled={!link}>
          Copy link
        </button>
      </div>
      <div className="flex items-baseline gap-3 mt-4">
        <p className="kicker">
          {invite?.count != null ? `${invite.count} ` : "— "}
          {invite?.count === 1 ? "person" : "people"} subscribed via your link
        </p>
        {flash && <span className="kicker text-gold">· {flash}</span>}
      </div>
    </section>
  );
}

/* ─── RSS card ──────────────────────────────────────────────── */
function RSSCard({ token }) {
  const [flash, setFlash] = useState("");
  if (!token) return null;
  const feedUrl = `${window.location.origin}/api/feed/${token}.xml`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setFlash("Copied");
      setTimeout(() => setFlash(""), 1800);
    } catch {
      setFlash("Couldn't copy");
    }
  };

  return (
    <section className="rss-card">
      <p className="eyebrow mb-2">Private RSS feed</p>
      <h3 className="font-display text-2xl text-paper mb-2">Read Dispatch in your feed reader.</h3>
      <p className="font-serif-body text-paper-dim mb-4">
        A private feed of your editions. Don't share this URL — it's tied to your account.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          readOnly
          value={feedUrl}
          className="email-input font-mono text-xs flex-1"
          onFocus={(e) => e.target.select()}
        />
        <button className="btn-ghost" onClick={copy}>
          Copy feed URL
        </button>
      </div>
      {flash && <p className="kicker text-gold mt-3">· {flash}</p>}
    </section>
  );
}
