import { Link } from "react-router-dom";
import Masthead from "../components/Masthead.jsx";
import PageMeta from "../components/PageMeta.jsx";

export default function About() {
  return (
    <>
      <PageMeta
        title="About"
        description="Why Dispatch was built — the morning newspaper recast for working developers. What we believe, who builds this, and what's explicitly out of scope."
      />
      <Masthead subscript="About Dispatch" />
      <main id="main" tabIndex={-1} className="legal-page">
        <p className="eyebrow text-center mb-3">A short history</p>
        <h2 className="font-display text-4xl md:text-5xl text-paper text-center leading-tight mb-3">
          Why we built Dispatch.
        </h2>
        <p className="kicker text-center mb-12">
          The product, in five paragraphs.
        </p>

        <hr className="rule-gold mb-10" />

        <article className="legal-body">
          <p className="dropcap">
            Technology moves too fast for any working developer to keep up by reading. There are
            too many sources, too much noise, too many takes about the same launch, and most of
            what's worth reading is buried under what isn't. The standard answer — bookmark
            HackerNews, follow a few people, skim Reddit — works for some people some days, but
            mostly produces the feeling of being slightly behind on something you can't name.
          </p>
          <p>
            Dispatch is built on a different premise: <em>an editor curates a morning paper for
            you</em>. An attentive AI editor, in our case, but an editor nonetheless. Each
            morning it reads HackerNews top stories, GitHub Trending, Lobsters, Reddit, arXiv's
            newest AI papers, Show HN's recent launches, and the month's "Who is hiring" thread.
            From that pool — usually a hundred or so distinct items — it selects what matches your
            role, skill level, and chosen beats. Then it writes the brief in a careful editorial
            voice, including a <em>why this matters</em> line on every story that's grounded in
            your career arc, not generic news framing.
          </p>
          <p>
            The result is a five-minute morning read shaped like a newspaper: a lede, an editor's
            note, an Editor's Pick with a deeper paragraph treatment, a featured comment from the
            HackerNews discussion when there is one, a pull quote, and the day's stories grouped by
            the beats you chose. Free, on weekdays, in your inbox at 8 a.m. local.
          </p>
          <p>
            Behind the page lives the actual work: source fetchers that respect each platform's
            etiquette, embeddings-based pre-filtering so we send only the most relevant 30 stories
            to the writer model (not all 100), cross-source clustering to avoid showing the same
            story three times, a quality scorer that runs after every generation to catch drift, an
            A/B framework for the prompt itself, and per-user click tracking that the brief uses to
            refine relevance over time. None of it is visible to you on the page. All of it is
            documented in the repo.
          </p>
          <p>
            The thing we care about most is the <em>voice</em>. Dispatch isn't trying to sound
            breathless. It isn't trying to sound like LinkedIn. It's trying to sound like a
            thoughtful friend with a newsroom job who read the wires this morning and is now
            telling you what mattered. If it ever starts sounding like anything else, that's a bug.
            Email us and we'll tune it.
          </p>
        </article>

        <hr className="rule-gold mt-16 mb-10" />

        <p className="eyebrow text-center mb-3">Who builds this</p>
        <h3 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-3">
          One developer, one editor, one inbox at a time.
        </h3>
        <p className="kicker text-center mb-10">The founder, in his own voice.</p>

        <article className="legal-body">
          <p>
            I'm a developer who started building Dispatch because I was tired of opening
            HackerNews every morning and feeling like I'd missed something — and equally tired
            of opening it and finding nothing worth the twenty minutes. The signal was there.
            The interface for getting at it wasn't. I had been reading a stack of email
            newsletters that were either too breathless, too generic, or so long they joined
            the pile of things I'd "read later." I wanted a morning paper that respected my
            time, knew what I was working on, and read like someone had actually thought about
            the news instead of just listing it.
          </p>
          <p>
            So I built one. Then I rebuilt it. Then I tightened the prompt. Then I added the
            sources I trust, dropped the ones I didn't, taught the editor to write a
            <em> why-this-matters</em> line for every story, grounded in your role and the hiring
            signal underneath it. Then I rebuilt the page until it stopped looking like a
            dashboard and started looking like a newspaper, which is what it is. Every line in
            every brief gets read by me before it goes live — for the foreseeable future, the
            editor has a human reading over its shoulder.
          </p>
          <p>
            If you subscribe, you're not signing up for a SaaS. You're signing up for a paper
            that one person is editing every morning, with an AI doing the heavy reading and a
            human keeping the voice honest. If anything feels off — a story that didn't belong,
            a line that sounded like a press release, a beat that's not landing — there's an
            email link in every footer and it goes to me, not a queue. I read every reply.
          </p>
        </article>

        <hr className="rule-gold mt-16 mb-10" />

        <p className="eyebrow text-center mb-3">What Dispatch is not</p>
        <h3 className="font-display text-3xl md:text-4xl text-paper text-center leading-tight mb-10">
          A short list of things we're deliberately not building.
        </h3>

        <article className="legal-body">
          <p>
            <strong className="text-paper">Dispatch is not a social network.</strong> There's no
            feed, no following, no profile. The unit of Dispatch is the daily brief, not the
            user-generated post.
          </p>
          <p>
            <strong className="text-paper">Dispatch is not a feed reader.</strong> If you want
            every story from a source, RSS exists and we won't outcompete it. We're trying to
            be the opposite — five things picked, four hundred ignored.
          </p>
          <p>
            <strong className="text-paper">Dispatch is not the world's best AI news app.</strong>
            {" "}We have no ambitions to be your one-stop everything. We're trying to be the one
            tab you keep open with your coffee.
          </p>
          <p>
            <strong className="text-paper">Dispatch is not a content marketing channel.</strong>
            {" "}We don't write blog posts to rank for keywords. We don't write threads to chase
            engagement. The product earns its own attention or it doesn't deserve any.
          </p>
          <p>
            <strong className="text-paper">Dispatch is not for sale.</strong> Free forever for
            the daily brief. If we ever charge, it's for power features (audio at scale, more
            sources, team versions) — never for the brief itself.
          </p>
        </article>

        <hr className="rule-double mt-16 mb-6" />
        <p className="text-center kicker">
          <Link to="/demo" className="text-gold hover:text-paper">See today's brief →</Link>
          <span className="mx-3 text-muted">·</span>
          <Link to="/say-hi" className="text-gold hover:text-paper">Say hi to the editor</Link>
        </p>
      </main>
    </>
  );
}
