import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../hooks/useAuth.js";

const SOURCE_LABELS = {
  hackernews: "HackerNews",
  github_trending: "GitHub",
  lobsters: "Lobsters",
  reddit: "Reddit",
  arxiv: "arXiv",
  show_hn: "Show HN",
};

export default function Saved() {
  const [bookmarks, setBookmarks] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const auth = useAuth();

  const load = () =>
    api
      .bookmarks()
      .then((d) => setBookmarks(d.bookmarks))
      .catch((err) => {
        if (err.status === 401) navigate("/login", { replace: true });
        else setError(String(err.message || err));
      });

  useEffect(() => {
    load();
  }, []);

  const onRemove = async (url) => {
    try {
      await api.removeBookmark(url);
      setBookmarks((b) => b.filter((x) => x.story_url !== url));
    } catch (err) {
      setError(String(err.message || err));
    }
  };

  const togglePublic = async (b) => {
    const next = !b.is_public;
    setBookmarks((arr) => arr.map((x) => (x.story_url === b.story_url ? { ...x, is_public: next } : x)));
    try {
      await api.setBookmarkVisibility(b.story_url, next);
    } catch (err) {
      // rollback
      setBookmarks((arr) => arr.map((x) => (x.story_url === b.story_url ? { ...x, is_public: !next } : x)));
      setError(String(err.message || err));
    }
  };

  if (error) {
    return (
      <>
        <Masthead subscript="Saved unavailable" />
        <main className="max-w-2xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words">{error}</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Masthead subscript="Saved for later" />
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <p className="eyebrow mb-3">Your clippings</p>
          <h2 className="font-display text-4xl md:text-5xl text-paper leading-tight mb-3">
            Stories you've saved.
          </h2>
          <p className="font-serif-body text-paper-dim text-lg leading-relaxed max-w-xl mx-auto">
            Press the star on any story to clip it here. The list is private.
          </p>
        </div>

        <hr className="rule-gold mb-8" />

        <HandleBanner auth={auth} />


        {bookmarks == null && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 space-y-2">
                <div className="shimmer h-3 w-24" />
                <div className="shimmer h-5 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {bookmarks && bookmarks.length === 0 && (
          <div className="card p-10 text-center">
            <p className="font-serif-body text-paper-dim italic">
              No clippings yet. Open any edition and tap the star next to a story.
            </p>
            <Link to="/archive" className="btn-ghost mt-6 inline-block">
              Browse the archive
            </Link>
          </div>
        )}

        {bookmarks && bookmarks.length > 0 && (
          <ul className="space-y-3">
            {bookmarks.map((b) => (
              <li key={b.id} className="saved-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="src-tag">{SOURCE_LABELS[b.source] || "Source"}</span>
                    <span className="story-meta">Saved {timeAgo(b.saved_at)}</span>
                    <button
                      onClick={() => togglePublic(b)}
                      className={`visibility-pill ${b.is_public ? "public" : "private"}`}
                      title={b.is_public ? "Public — shown on your profile" : "Private — only you"}
                    >
                      {b.is_public ? "● Public" : "○ Private"}
                    </button>
                  </div>
                  <button className="bookmark-btn saved" onClick={() => onRemove(b.story_url)} title="Remove">
                    ★
                  </button>
                </div>
                <a
                  href={b.story_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display text-xl md:text-2xl text-paper hover:text-gold leading-snug block"
                >
                  {b.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

/* ─── Handle banner — set/edit your public profile handle ──── */
function HandleBanner({ auth }) {
  const [handle, setHandle] = useState(auth?.user?.handle || "");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    setHandle(auth?.user?.handle || "");
  }, [auth?.user?.handle]);

  if (auth.loading || !auth.user) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    const clean = handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (clean.length < 2) {
      setError("Handles need at least 2 letters or digits.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateMe({ handle: clean });
      setFlash("Saved — your profile lives at /p/" + clean);
      auth.refresh();
      setTimeout(() => setFlash(""), 4000);
    } catch (err) {
      const msg = String(err.message || err);
      setError(msg.includes("duplicate") || msg.includes("unique") ? "That handle is taken." : msg);
    } finally {
      setSaving(false);
    }
  };

  const clearHandle = async () => {
    setSaving(true);
    try {
      await api.updateMe({ handle: null });
      setHandle("");
      auth.refresh();
      setFlash("Handle cleared. Your profile is no longer public.");
      setTimeout(() => setFlash(""), 4000);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const currentHandle = auth.user.handle;

  return (
    <section className="handle-banner mb-8">
      <p className="eyebrow mb-2">Public profile</p>
      {currentHandle ? (
        <div className="font-serif-body text-paper-dim text-sm mb-3">
          Your public profile lives at{" "}
          <a href={`/p/${currentHandle}`} target="_blank" rel="noreferrer" className="text-gold">
            /p/{currentHandle}
          </a>
          . Bookmarks tagged <strong className="text-paper">Public</strong> below show up there.
        </div>
      ) : (
        <p className="font-serif-body text-paper-dim text-sm mb-3">
          Pick a handle to enable a public profile at <code className="font-mono text-paper">/p/&lt;handle&gt;</code>.
          Bookmarks default to private — you opt each one in.
        </p>
      )}
      <form onSubmit={submit} className="flex gap-2 flex-wrap max-w-md">
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="your-handle"
          className="email-input flex-1 font-mono text-sm"
          maxLength={32}
          disabled={saving}
        />
        <button className="btn-primary" disabled={saving || !handle.trim()}>
          {saving ? "Saving…" : currentHandle === handle ? "Saved" : currentHandle ? "Update" : "Set handle"}
        </button>
        {currentHandle && (
          <button type="button" className="btn-ghost" onClick={clearHandle} disabled={saving}>
            Clear
          </button>
        )}
      </form>
      {flash && <p className="kicker mt-3 text-gold">{flash}</p>}
      {error && <p className="kicker mt-3" style={{ color: "#d49a9a" }}>{error}</p>}
    </section>
  );
}

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}
