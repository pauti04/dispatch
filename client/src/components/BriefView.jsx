import Story from "./Story.jsx";
import PullQuote from "./PullQuote.jsx";
import ByTheNumbers from "./ByTheNumbers.jsx";
import SkillsTrending from "./SkillsTrending.jsx";
import ReadingProgress from "./ReadingProgress.jsx";

function FeaturedComment({ fc }) {
  return (
    <figure className="featured-comment my-10">
      <p className="kicker mb-3 text-center">From the comments</p>
      <blockquote className="featured-comment-text">
        <span className="featured-comment-mark" aria-hidden>“</span>
        {fc.text}
      </blockquote>
      <figcaption className="featured-comment-attr">— {fc.author}, in today's HackerNews discussion</figcaption>
    </figure>
  );
}

export default function BriefView({ brief, prefs, header, footer, bookmarks, editionSlug }) {
  const onBookmark = bookmarks?.toggle;
  const isBookmarked = bookmarks?.isBookmarked || (() => false);
  const storyProps = (st) => ({
    isBookmarked: isBookmarked(st.url),
    onBookmark: onBookmark ? onBookmark : undefined,
    editionSlug,
  });
  const totalStories = brief.sections.reduce((n, s) => n + s.stories.length, 0);
  const readMins = Math.max(1, Math.round(totalStories * (prefs?.depth === "deep" ? 1.2 : 0.6)));

  const pickRef = brief.editor_pick;
  const pickStory = pickRef
    ? brief.sections.flatMap((s) => s.stories).find((st) => st.ref === pickRef)
    : null;

  const sectionsWithoutPick = brief.sections
    .map((sec) => ({
      ...sec,
      stories: sec.stories.filter((st) => st.ref !== pickRef),
    }))
    .filter((sec) => sec.stories.length > 0);

  const remainingTotal = sectionsWithoutPick.reduce((n, s) => n + s.stories.length, 0);
  let leftCount = 0;
  const left = [];
  const right = [];
  for (const sec of sectionsWithoutPick) {
    if (leftCount + sec.stories.length <= remainingTotal / 2 || left.length === 0) {
      left.push(sec);
      leftCount += sec.stories.length;
    } else {
      right.push(sec);
    }
  }

  return (
    <>
    <ReadingProgress />
    <main id="main" tabIndex={-1} className="max-w-6xl mx-auto px-6 py-10">
      {/* Wave N+ — Founder note (when present). Surfaces atop the brief, before the lede. */}
      {brief.founder_note?.body && (
        <section className="founder-note mb-10 max-w-2xl mx-auto" aria-label="Note from the editor">
          <p className="kicker text-center mb-2">From the editor's desk</p>
          <p className="font-serif-body text-paper leading-relaxed text-center italic">
            {brief.founder_note.body}
          </p>
        </section>
      )}

      {/* Hero */}
      <section className="text-center mb-8 max-w-4xl mx-auto">
        <p className="eyebrow mb-4">Today's lede</p>
        <h2 className="font-display text-4xl md:text-6xl text-paper leading-[1.05] mb-5">
          {brief.headline}
        </h2>
        {brief.editor_note && (
          <p className="font-serif-body italic text-paper-dim text-lg leading-relaxed max-w-2xl mx-auto mb-5">
            {brief.editor_note}
            <span className="block kicker mt-2 not-italic">— The Editor</span>
          </p>
        )}
        {brief.take && (
          <div className="editor-take">
            <p className="eyebrow mb-2">The Editor's Take</p>
            <p className="font-display text-xl md:text-2xl text-paper leading-snug max-w-2xl mx-auto">
              {brief.take}
            </p>
          </div>
        )}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="story-meta">≈ {readMins} min read</span>
          <span className="story-meta">·</span>
          <span className="story-meta">
            {totalStories} {totalStories === 1 ? "story" : "stories"}
          </span>
          <span className="story-meta">·</span>
          <span className="story-meta">{brief.sections.length} beats</span>
        </div>
      </section>

      <hr className="rule-gold mb-8" />

      {header && <div className="no-print mb-10 pb-6 border-b border-rule">{header}</div>}

      {brief.sections.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif-body text-paper-dim text-lg italic">
            Nothing on your beats today. Try broader topics, or come back in an hour.
          </p>
        </div>
      ) : (
        <>
          {brief.featured_comment && <FeaturedComment fc={brief.featured_comment} />}

          {pickStory && (
            <section className="editors-pick-banner mb-12">
              <Story story={pickStory} isPick {...storyProps(pickStory)} />
            </section>
          )}

          <PullQuote text={brief.pull_quote} />

          <div className="grid md:grid-cols-3 gap-x-12">
            <div className="md:col-span-2 grid md:grid-cols-2 gap-x-12 gap-y-2">
              <div className="space-y-10">
                {left.map((sec) => (
                  <section key={sec.topic}>
                    <div className="mb-5">
                      <p className="eyebrow mb-2">{sec.topic}</p>
                      <hr className="rule" />
                    </div>
                    <div className="space-y-6">
                      {sec.stories.map((st, i) => (
                        <Story
                          key={st.ref}
                          story={st}
                          lead={left[0] === sec && i === 0 && !pickStory}
                          {...storyProps(st)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="space-y-10 md:col-rule md:pl-12">
                {right.map((sec) => (
                  <section key={sec.topic}>
                    <div className="mb-5">
                      <p className="eyebrow mb-2">{sec.topic}</p>
                      <hr className="rule" />
                    </div>
                    <div className="space-y-6">
                      {sec.stories.map((st) => (
                        <Story key={st.ref} story={st} {...storyProps(st)} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="mt-12 md:mt-0">
              <div className="sticky-rail">
                <ByTheNumbers brief={brief} />
                {bookmarks?.authed && <SkillsTrending />}
              </div>
            </div>
          </div>
        </>
      )}

      {Array.isArray(brief.letters) && brief.letters.length > 0 && (
        <section className="letters-section">
          <p className="eyebrow text-center mb-2">Letters</p>
          <p className="kicker text-center mb-6">From yesterday's readers</p>
          {brief.letters.map((l) => (
            <figure key={l.id} className="letter-card">
              <blockquote className="letter-body">{l.body}</blockquote>
              <figcaption className="letter-attr">— {l.author || "a reader"}</figcaption>
            </figure>
          ))}
        </section>
      )}

      {footer && <div>{footer}</div>}

      <hr className="rule-double mt-16 mb-6" />
      <footer className="text-center space-y-1">
        <p className="kicker">Colophon</p>
        <p className="font-serif-body text-muted text-sm italic max-w-xl mx-auto">
          Edited by an attentive language model. Sourced from HackerNews and GitHub Trending.
          Issued {new Date(brief.generated_at).toLocaleTimeString()} from your local press.
        </p>
      </footer>
    </main>
    </>
  );
}
