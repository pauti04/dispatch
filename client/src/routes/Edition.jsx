import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import BriefView from "../components/BriefView.jsx";
import Shimmer from "../components/Shimmer.jsx";
import DemoModeNotice from "../components/DemoModeNotice.jsx";
import { api, IS_STATIC_ONLY } from "../lib/api.js";
import { useBookmarks } from "../hooks/useBookmarks.js";

function LetterForm({ slug }) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState(null); // 'sending' | 'sent' | error string

  const submit = async (e) => {
    e.preventDefault();
    if (body.trim().length < 20) {
      setStatus("Letters must be at least 20 characters.");
      return;
    }
    setStatus("sending");
    try {
      await api.postLetter(slug, body.trim());
      setStatus("sent");
      setBody("");
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setStatus(String(err.message || err));
    }
  };

  return (
    <section className="letter-form no-print">
      <p className="eyebrow text-center mb-2">Letters to the Editor</p>
      <p className="font-serif-body text-paper-dim text-sm italic text-center mb-5 max-w-lg mx-auto">
        Have a take on today's edition? Send a short letter. The best go into tomorrow's brief.
      </p>
      <form onSubmit={submit} className="max-w-2xl mx-auto">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={800}
          placeholder="Two sentences works. Three is plenty."
          className="letter-textarea"
        />
        <div className="flex items-center justify-between gap-3 mt-3">
          <p className="kicker">
            {body.length}/800 {body.length < 20 && "(min 20)"}
          </p>
          <div className="flex items-center gap-3">
            {status === "sent" && <span className="kicker">✓ Letter sent</span>}
            {status && status !== "sending" && status !== "sent" && (
              <span className="kicker text-red-400">{status}</span>
            )}
            <button
              className="btn-primary"
              disabled={status === "sending" || body.trim().length < 20}
            >
              {status === "sending" ? "Sending…" : "Send letter"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default function Edition() {
  if (IS_STATIC_ONLY) {
    return <DemoModeNotice feature="This edition view" subscript="Edition · demo mode" />;
  }
  const { slug } = useParams();
  const [params] = useSearchParams();
  const viewToken = params.get("t");
  const teamToken = params.get("team");
  const [edition, setEdition] = useState(null);
  const [error, setError] = useState(null);
  const [shareFlash, setShareFlash] = useState("");
  const [audioOpen, setAudioOpen] = useState(false);
  const bookmarks = useBookmarks();

  useEffect(() => {
    // Build query string supporting either view token (t) or team-share token (team)
    const qs = viewToken
      ? `?t=${encodeURIComponent(viewToken)}`
      : teamToken
      ? `?team=${encodeURIComponent(teamToken)}`
      : "";
    fetch(`/api/editions/${encodeURIComponent(slug)}${qs}`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        setEdition(data.edition);
      })
      .catch((e) => setError(String(e.message || e)));
  }, [slug, viewToken, teamToken]);

  if (error) {
    return (
      <>
        <Masthead subscript="Edition unavailable" />
        <main className="max-w-xl mx-auto px-6 py-16 text-center">
          <p className="font-mono text-sm text-muted break-words">{error}</p>
        </main>
      </>
    );
  }
  if (!edition) return <Shimmer subscript="Loading edition…" />;

  const dateLabel = new Date(edition.edition_date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <Masthead subscript={`Edition for ${dateLabel}`} />

      <div className="cta-strip no-print">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-serif-body italic text-paper-dim text-sm">
            Saved this edition. Share it?
          </p>
          <div className="flex gap-2 flex-wrap">
            {shareFlash && <span className="kicker">{shareFlash}</span>}
            <button
              className="btn-ghost"
              onClick={() => setAudioOpen((o) => !o)}
            >
              {audioOpen ? "Hide audio" : "Listen"}
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                try {
                  const { token } = await api.teamShare(slug);
                  const url = `${window.location.origin}/edition/${slug}?team=${encodeURIComponent(token)}`;
                  await navigator.clipboard.writeText(url);
                  setShareFlash("Team link copied · valid 7 days");
                  setTimeout(() => setShareFlash(""), 4000);
                } catch (err) {
                  setShareFlash("Couldn't create team link");
                }
              }}
            >
              Share with my team
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                const email = prompt("Forward today's edition to which email?");
                if (!email || !email.includes("@")) return;
                try {
                  await api.forwardEdition(slug, email);
                  setShareFlash(`Forwarded to ${email}`);
                  setTimeout(() => setShareFlash(""), 4000);
                } catch (err) {
                  setShareFlash(`Forward failed: ${err.message || err}`);
                  setTimeout(() => setShareFlash(""), 5000);
                }
              }}
            >
              Forward
            </button>
            <button
              className="btn-ghost"
              onClick={async () => {
                const shareUrl = `${window.location.origin}/share/${slug}`;
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: edition.data?.headline || "Dispatch · Tech",
                      url: shareUrl,
                    });
                    return;
                  } catch {}
                }
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setShareFlash("Copied to clipboard");
                  setTimeout(() => setShareFlash(""), 2200);
                } catch {
                  setShareFlash("Couldn't copy — long-press the link");
                }
              }}
            >
              Share edition
            </button>
            <a
              className="btn-primary"
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                (edition.data?.headline || "Today's Dispatch · Tech") + " — via @dispatch"
              )}&url=${encodeURIComponent(`${window.location.origin}/share/${slug}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Tweet it
            </a>
            {/* Wave N+ — Bluesky intent. https://bsky.app/intent/compose?text= */}
            <a
              className="btn-ghost"
              href={`https://bsky.app/intent/compose?text=${encodeURIComponent(
                (edition.data?.headline || "Today's Dispatch · Tech") +
                  "\n\n" +
                  `${window.location.origin}/share/${slug}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Post to Bluesky
            </a>
            {/* Wave N+ — Mastodon intent. Uses share-on-mastodon.glitch.me as a fallback
                domain-picker; advanced users can long-press to choose a different instance. */}
            <a
              className="btn-ghost"
              href={`https://toot.kytta.dev/?text=${encodeURIComponent(
                (edition.data?.headline || "Today's Dispatch · Tech") +
                  "\n\n" +
                  `${window.location.origin}/share/${slug}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Toot it
            </a>
          </div>
        </div>
      </div>

      {audioOpen && (
        <div className="max-w-6xl mx-auto px-6 mt-3">
          <div className="audio-pane">
            <p className="kicker mb-2">Audio edition · narrated</p>
            <audio
              controls
              preload="metadata"
              src={`/api/editions/${slug}/audio.mp3${viewToken ? `?t=${encodeURIComponent(viewToken)}` : ""}`}
              style={{ width: "100%" }}
            />
            <p className="font-serif-body text-muted text-sm italic mt-2">
              First play takes a few seconds to synthesize.
            </p>
          </div>
        </div>
      )}

      <BriefView
        brief={edition.data}
        prefs={{ depth: edition.data.depth }}
        bookmarks={bookmarks.authed ? bookmarks : null}
        footer={bookmarks.authed ? <LetterForm slug={slug} /> : null}
        editionSlug={slug}
      />
    </>
  );
}
