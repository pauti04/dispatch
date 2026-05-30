import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";

export default function Unsubscribe() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="Unsubscribing" subscript="Unsubscribe · demo mode" />;
  }
  const [params] = useSearchParams();
  const token = params.get("t") || params.get("token");
  const [state, setState] = useState({ loading: true, email: null, error: null });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: "No token in URL." });
      return;
    }
    api
      .unsubscribe(token)
      .then((d) => setState({ loading: false, email: d.email }))
      .catch((e) => setState({ loading: false, error: String(e.message || e) }));
  }, [token]);

  return (
    <>
      <Masthead subscript={state.loading ? "Processing…" : state.error ? "Unsubscribe failed" : "Unsubscribed"} />
      <main id="main" tabIndex={-1} className="max-w-xl mx-auto px-6 py-16 text-center">
        {state.loading ? (
          <p className="font-serif-body text-paper-dim italic">Just a moment…</p>
        ) : state.error ? (
          <>
            <p className="eyebrow mb-3">Couldn't unsubscribe</p>
            <p className="font-mono text-sm text-muted break-words mb-8">{state.error}</p>
            <Link to="/login" className="btn-ghost">
              Sign in to manage your subscription
            </Link>
          </>
        ) : (
          <>
            <p className="eyebrow mb-3">You're unsubscribed</p>
            <h2 className="font-display text-3xl text-paper mb-4">
              We won't email <em>{state.email}</em> anymore.
            </h2>
            <p className="font-serif-body text-paper-dim leading-relaxed mb-8">
              Sorry to see you go. If you change your mind, you can resubscribe any time from your
              account.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/" className="btn-ghost">
                Back to Dispatch
              </Link>
              <Link to="/login" className="btn-primary">
                Resubscribe
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
