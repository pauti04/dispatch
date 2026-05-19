# 90-second walkthrough script

For a Loom / YouTube short / Twitter video. Pace: ~150 words / minute. Total: ~220 words.

Equipment: a screen recorder (Loom, QuickTime, OBS). Don't bother with a webcam — voice-over only.

---

## Beats (with what's on screen + what you say)

**[0:00 — 0:08] On screen: /** (landing)
> "This is Dispatch. It's a daily morning brief for working developers — an AI editor reads HackerNews and a few other sources every morning, picks five things worth your attention, and writes a tight brief in plain editorial voice."

**[0:08 — 0:20] On screen: scroll down to anatomy section, hover the three pillars**
> "The product looks like a newspaper because it is one. There's a lede, an editor's pick, and a pull quote. That's the anatomy. The whole brand commits to less — five things picked, four hundred ignored."

**[0:20 — 0:40] On screen: click /demo, scroll through the annotated edition slowly**
> "Here's a real brief. The gold callouts are annotations I built specifically for new visitors — they teach you the craft of the page as you scroll. The Editor's Pick gets a paragraph treatment. The Pull Quote is composed by the editor, not lifted. The Editor's Take commits to an explicit position every day."

**[0:40 — 0:55] On screen: scroll to "what just happened" reveal**
> "At the bottom there's a little reveal — it shows how many stories the editor read this morning, and that the whole thing was written in under fifteen seconds. The wow moment plays the magic back."

**[0:55 — 1:15] On screen: navigate to /try, pick a role, generate a brief, watch the stream**
> "If you want one tuned to your role, you pick a role, your skill level, and the beats you care about. The brief streams in via Server-Sent Events. From hitting submit to first headline is about eight hundred milliseconds."

**[1:15 — 1:30] On screen: open /showcase, scroll through the tech stack section quickly**
> "Under the hood: Vite + React frontend, Express + Postgres backend, OpenAI for the writer, plus an embeddings pre-filter that cuts cost by seventy percent before the writer call. LLM-as-judge scores every brief for voice drift. Built in fourteen waves, ships on web, mobile, and a Chrome extension."

**[1:30 — closing] Optional outro**
> "Source is on GitHub. There's a live demo, a manifesto, and a press kit on the site. Thanks for watching."

---

## Tips while recording

- **Don't move the cursor while talking.** Mouse jiggling on screen is the #1 thing that makes a screen recording look amateur.
- **Pause between beats.** Two-second gaps let viewers process. They feel longer when you're recording than when you're watching.
- **Open every tab beforehand.** Don't type URLs on screen unless you're showing typing.
- **Pre-warm /demo and /try.** First brief generation takes ~10s; have the cache warm before you record so it's instant.
- **Use Mac's hidden cursor mode** (`defaults write com.apple.universalaccess cursor-show -bool false`) only if you've practiced — easy to confuse yourself.
- **Re-record the beat, not the whole thing.** Loom + most editors let you splice clips.
- **First take is rarely the keeper.** Plan for 3-4 takes. Don't skip this.

## After recording

- Trim leading silence (every recording has ~1s of dead air)
- Add subtitles (Loom does this automatically; YouTube via Studio)
- Title: "Dispatch — a 90s walkthrough" (or similar — short, descriptive, no emojis)
- Description: paste the resume one-liner + link to /showcase + link to /demo
- Pin to your portfolio site
