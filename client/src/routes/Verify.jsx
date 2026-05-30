import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";

export default function Verify() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="Magic-link sign-in" subscript="Verify · demo mode" />;
  }
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: null });
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState({ loading: false, error: "No token in URL." });
      return;
    }
    api
      .authVerify(token)
      .then(() => {
        navigate("/account?welcome=1", { replace: true });
      })
      .catch((err) => setState({ loading: false, error: String(err.message || err) }));
  }, [params, navigate]);

  return (
    <>
      <Masthead subscript={state.loading ? "Verifying your link…" : "Sign-in failed"} />
      <main id="main" tabIndex={-1} className="max-w-xl mx-auto px-6 py-16 text-center">
        {state.loading ? (
          <p className="font-serif-body text-paper-dim text-lg italic">Just a moment…</p>
        ) : (
          <>
            <p className="eyebrow mb-3">Sign-in failed</p>
            <h2 className="font-display text-3xl text-paper mb-4">That link didn't work.</h2>
            <p className="font-mono text-sm text-muted break-words mb-8">{state.error}</p>
            <Link to="/login" className="btn-primary">
              Request a new link
            </Link>
          </>
        )}
      </main>
    </>
  );
}
