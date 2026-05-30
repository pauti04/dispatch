import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";

export default function Referrals() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="Your referrals" subscript="Referrals · demo mode" />;
  }
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState(null);
  const [invite, setInvite] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([
      api.inviteStats().catch((e) => {
        if (e.status === 401) navigate("/login", { replace: true });
        else throw e;
      }),
      api.inviteLeaderboard().catch(() => ({ leaderboard: [] })),
      api.myInvite().catch(() => null),
    ])
      .then(([s, b, i]) => {
        setStats(s);
        setBoard(b);
        setInvite(i);
      })
      .catch((e) => setErr(String(e.message || e)));
  }, [navigate]);

  if (err) {
    return (
      <>
        <Masthead subscript="Referrals unavailable" />
        <main id="main" tabIndex={-1} className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words">{err}</p>
        </main>
      </>
    );
  }

  const link = invite?.token ? `${window.location.origin}/i/${invite.token}` : "";

  return (
    <>
      <Masthead subscript="Referrals" />

      <main id="main" tabIndex={-1} className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        <section className="text-center">
          <p className="eyebrow mb-3">Your invite stats</p>
          <h2 className="font-display text-4xl text-paper leading-tight mb-3">
            People you've brought to Dispatch.
          </h2>
          <div className="referrals-stats">
            <div className="referrals-stat">
              <div className="referrals-stat-n font-display">{stats?.total ?? "—"}</div>
              <div className="kicker">Total</div>
            </div>
            <div className="referrals-stat">
              <div className="referrals-stat-n font-display">{stats?.month ?? "—"}</div>
              <div className="kicker">Past 30 days</div>
            </div>
            <div className="referrals-stat">
              <div className="referrals-stat-n font-display">{stats?.week ?? "—"}</div>
              <div className="kicker">This week</div>
            </div>
          </div>
          {link && (
            <p className="font-mono text-xs text-paper-dim mt-6 break-all">
              Your link: <a className="text-gold" href={link}>{link}</a>
            </p>
          )}
        </section>

        <hr className="rule-gold" />

        <section>
          <p className="eyebrow text-center mb-3">All-time leaderboard</p>
          <h3 className="font-display text-2xl text-paper text-center mb-6">
            Top inviters on Dispatch.
          </h3>
          {board?.leaderboard?.length ? (
            <ol className="leaderboard">
              {board.leaderboard.map((row, i) => (
                <li key={i} className="leaderboard-row">
                  <span className="leaderboard-rank font-display">{i + 1}.</span>
                  <span className="leaderboard-email font-mono">{row.email_hint}</span>
                  <span className="leaderboard-count kicker">{row.redemptions} subscribers</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="font-serif-body text-paper-dim italic text-center">
              No referrals yet. <Link to="/account" className="text-gold">Grab your link from your account</Link> and be first on the board.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
