import { useState } from "react";
import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";
import { track, events, getStoredUTMs } from "../lib/analytics.js";

const LS_KEY = "dispatch.prefs.v2";
const LS_KEY_LEGACY = "dispatch.prefs.v1";
function loadPrefs() {
  try {
    const v2 = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (v2) return v2;
    return JSON.parse(localStorage.getItem(LS_KEY_LEGACY) || "null");
  } catch {
    return null;
  }
}

export default function Signup({ mode = "signup" }) {
  if (IS_STATIC_ONLY) {
    return (
      <DemoModeNotice
        feature={mode === "signup" ? "Subscribing" : "Signing in"}
        subscript={mode === "signup" ? "Signup · demo mode" : "Login · demo mode"}
      />
    );
  }
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null); // { dev_link? }
  const [error, setError] = useState(null);
  const prefs = loadPrefs();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const inviteToken = (() => {
        try {
          return localStorage.getItem("dispatch.invite_token") || undefined;
        } catch {
          return undefined;
        }
      })();
      const utms = getStoredUTMs();
      const data = await api.authRequest({
        email,
        role: prefs?.role,
        skill_level: prefs?.skill_level,
        domains: prefs?.domains || prefs?.topics,
        depth: prefs?.depth,
        invite_token: inviteToken,
        attribution: utms || undefined,
      });
      track(events.SIGNUP_REQUESTED, {
        mode: isSignup ? "signup" : "login",
        had_prefs: !!prefs,
        utm_source: utms?.utm_source,
        utm_medium: utms?.utm_medium,
        utm_campaign: utms?.utm_campaign,
      });
      setSent(data);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  };

  const isSignup = mode === "signup";

  if (sent) {
    return (
      <>
        <Masthead subscript="Check your inbox" />
        <main id="main" tabIndex={-1} className="max-w-xl mx-auto px-6 py-16 text-center">
          <p className="eyebrow mb-4">We sent you a link</p>
          <h2 className="font-display text-3xl text-paper mb-4">Open the email from Dispatch.</h2>
          <p className="font-serif-body text-paper-dim leading-relaxed">
            Click the magic link inside to {isSignup ? "finish setting up your subscription" : "sign in"}. The link expires in 15 minutes.
          </p>
          {sent.dev_link && (
            <div className="mt-10 p-4 border border-rule text-left">
              <p className="kicker mb-2">Dev mode</p>
              <p className="font-mono text-xs text-paper-dim break-all">
                Email isn't configured yet, so here's the link directly:
              </p>
              <a className="font-mono text-xs text-gold break-all underline" href={sent.dev_link}>
                {sent.dev_link}
              </a>
            </div>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead subscript={isSignup ? "Subscribe to your edition" : "Welcome back"} />
      <main id="main" tabIndex={-1} className="max-w-xl mx-auto px-6 py-16">
        <p className="eyebrow mb-3 text-center">{isSignup ? "One more step" : "Sign in"}</p>
        <h2 className="font-display text-4xl text-paper text-center mb-4">
          {isSignup ? "Get your first brief tomorrow morning." : "Sign in with your email."}
        </h2>
        <p className="font-serif-body text-paper-dim text-center leading-relaxed mb-10">
          {isSignup
            ? "Drop your email below. We'll send a one-click magic link to confirm — no password to remember."
            : "We'll email you a magic link to sign in. No password."}
        </p>

        {isSignup && (prefs?.domains?.length || prefs?.topics?.length) ? (
          <p className="text-center text-muted text-sm mb-6 italic">
            Your beats: {(prefs.domains || prefs.topics).join(" · ")}
          </p>
        ) : null}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="email-input"
          />
          <button className="btn-primary" disabled={busy || !email}>
            {busy ? "Sending…" : isSignup ? "Send my magic link" : "Send sign-in link"}
          </button>
          {error && <p className="text-center text-sm text-red-400 font-mono">{error}</p>}
        </form>

        <p className="text-center text-muted text-sm mt-8 italic">
          {isSignup ? (
            <>
              Already subscribe? <Link to="/login" className="underline">Sign in</Link>.
            </>
          ) : (
            <>
              New here? <Link to="/signup">Set up a subscription</Link>.
            </>
          )}
        </p>
      </main>
    </>
  );
}
