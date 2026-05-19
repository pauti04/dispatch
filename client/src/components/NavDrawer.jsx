import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api.js";

// Wave M.4 — slimmed to the wedge. The wedge is the daily email; everything
// else is supporting and stays alive at its route but isn't promoted in nav.
// (Streak, Discover, Referrals, Search, browser extension, cross-pub teasers,
// Reports — all reachable via URL or keyboard shortcut, none in main nav.)
const LINKS_ANON = [
  { to: "/", label: "Home" },
  { to: "/demo", label: "See today's brief" },
  { to: "/manifesto", label: "Manifesto" },
  { to: "/about", label: "About" },
  { to: "/say-hi", label: "Say hi" },
];
const LINKS_AUTHED = [
  { to: "/today", label: "Today's edition" },
  { to: "/account", label: "Account" },
  { to: "/saved", label: "Saved stories" },
  { to: "/archive", label: "Archive" },
  { to: "/about", label: "About" },
  { to: "/say-hi", label: "Say hi" },
];

export default function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then(() => !cancelled && setAuthed(true))
      .catch(() => !cancelled && setAuthed(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = authed ? LINKS_AUTHED : LINKS_ANON;
  const signOut = async () => {
    try {
      await api.authLogout();
    } catch {}
    window.location.href = "/";
  };

  return (
    <>
      <button
        className="nav-trigger no-print"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <span />
        <span />
        <span />
      </button>

      {open && (
        <div className="nav-backdrop" onClick={() => setOpen(false)}>
          <aside
            className="nav-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Site navigation"
          >
            <div className="nav-head">
              <div>
                <p className="kicker mb-0.5">Dispatch</p>
                <p className="font-serif-body text-paper-dim text-sm italic">
                  {authed ? "Signed in" : "Browse Dispatch"}
                </p>
              </div>
              <button className="nav-close" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <ul className="nav-list">
              {links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className={`nav-link ${location.pathname === l.to ? "active" : ""}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            {authed && (
              <div className="nav-footer">
                <button onClick={signOut} className="nav-signout">
                  Sign out
                </button>
              </div>
            )}
            {!authed && (
              <div className="nav-footer">
                <Link to="/signup" className="nav-cta">
                  Subscribe
                </Link>
                <Link to="/login" className="nav-link">
                  Sign in
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
