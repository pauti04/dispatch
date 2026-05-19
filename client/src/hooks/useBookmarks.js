import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";

/**
 * Loads the current user's bookmarks once on mount, exposes:
 *   - urlSet: Set of bookmarked URLs (fast lookup)
 *   - toggle(story): add or remove
 *   - loading / authed: state flags
 *
 * Silently handles 401 (anonymous users can't bookmark; UI hides the star).
 */
export function useBookmarks() {
  const [urlSet, setUrlSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .bookmarks()
      .then((d) => {
        if (cancelled) return;
        setUrlSet(new Set((d.bookmarks || []).map((b) => b.story_url)));
        setAuthed(true);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setAuthed(err.status !== 401 ? null : false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(
    async (story) => {
      if (!story?.url) return;
      const isBookmarked = urlSet.has(story.url);
      const next = new Set(urlSet);
      // optimistic update
      if (isBookmarked) {
        next.delete(story.url);
      } else {
        next.add(story.url);
      }
      setUrlSet(next);
      try {
        if (isBookmarked) {
          await api.removeBookmark(story.url);
        } else {
          await api.addBookmark({
            story_url: story.url,
            title: story.title || "(untitled)",
            source: story.source,
          });
        }
      } catch (err) {
        // rollback
        setUrlSet(urlSet);
        throw err;
      }
    },
    [urlSet]
  );

  const isBookmarked = useCallback((url) => urlSet.has(url), [urlSet]);

  return { urlSet, isBookmarked, toggle, loading, authed };
}
