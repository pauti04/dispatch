import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";

const INVITE_LS_KEY = "dispatch.invite_token";

export default function Invite() {
  const { token } = useParams();
  const [inviter, setInviter] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem(INVITE_LS_KEY, token);
    } catch {}

    fetch(`/api/invites/lookup/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInviter(d?.inviter_hint || "a friend"))
      .catch(() => setInviter("a friend"));

    // Brief landing then redirect to /try so the new visitor can preview before signup
    const t = setTimeout(() => navigate("/try", { replace: true }), 1800);
    return () => clearTimeout(t);
  }, [token, navigate]);

  return (
    <>
      <Masthead subscript="You've been invited" />
      <main className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="eyebrow mb-3">A personal invitation</p>
        <h2 className="font-display text-4xl text-paper leading-tight mb-3">
          Welcome to Dispatch.
        </h2>
        <p className="font-serif-body text-paper-dim text-lg leading-relaxed">
          {inviter ? (
            <>
              <em className="text-paper">{inviter}</em> thought you might enjoy the morning brief.
              Let's get you set up.
            </>
          ) : (
            "Let's get you set up."
          )}
        </p>
        <p className="kicker mt-8">Taking you to your preview…</p>
      </main>
    </>
  );
}

export { INVITE_LS_KEY };
