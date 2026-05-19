import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const FONT_URL_SERIF =
  "https://cdn.jsdelivr.net/fontsource/fonts/dm-serif-display@latest/latin-400-normal.ttf";
const FONT_URL_SANS =
  "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-600-normal.ttf";

let fontCache = null;
async function loadFonts() {
  if (fontCache) return fontCache;
  const [serif, sans] = await Promise.all([
    fetch(FONT_URL_SERIF).then((r) => r.arrayBuffer()),
    fetch(FONT_URL_SANS).then((r) => r.arrayBuffer()),
  ]);
  fontCache = [
    { name: "DM Serif Display", data: serif, weight: 400, style: "normal" },
    { name: "Inter", data: sans, weight: 600, style: "normal" },
  ];
  return fontCache;
}

/**
 * Render an OG card for an edition. Returns a PNG buffer at 1200×630.
 *
 * Layout: cream paper background, gold double-rule top, big serif headline,
 * "DISPATCH · TECH" eyebrow, date footer with gold accent. Matches the editorial brand.
 */
/**
 * Single-story OG card. Same brand, smaller body text, source tag visible.
 */
export async function renderStoryOG({ title, source, date }) {
  const fonts = await loadFonts();
  const dateStr = date
    ? new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()
    : "TODAY";
  const sourceLabel =
    { hackernews: "HACKERNEWS", github_trending: "GITHUB", lobsters: "LOBSTERS", reddit: "REDDIT", arxiv: "ARXIV", show_hn: "SHOW HN" }[
      source
    ] || "SOURCE";
  const safe = (title || "Today on Dispatch").slice(0, 200);

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fdfaf2",
          padding: "56px 80px",
          fontFamily: "DM Serif Display",
        },
        children: [
          {
            type: "div",
            props: {
              style: { borderTop: "2px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", height: "8px", marginBottom: "20px" },
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "Inter",
                fontSize: "15px",
                letterSpacing: "5px",
                color: "#8b6914",
                textTransform: "uppercase",
                marginBottom: "8px",
              },
              children: [
                { type: "span", props: { children: "Dispatch · Tech" } },
                { type: "span", props: { children: dateStr } },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontFamily: "Inter",
                fontSize: "13px",
                letterSpacing: "3px",
                color: "#5a4a1a",
                textTransform: "uppercase",
                marginTop: "16px",
                marginBottom: "8px",
              },
              children: `From ${sourceLabel}`,
            },
          },
          {
            type: "div",
            props: {
              style: { borderTop: "2px solid #8b6914", marginTop: "8px", marginBottom: "36px" },
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontFamily: "DM Serif Display",
                fontSize: safe.length > 110 ? "48px" : safe.length > 70 ? "58px" : "70px",
                lineHeight: 1.08,
                color: "#1a1a1a",
                display: "flex",
                flex: 1,
              },
              children: safe,
            },
          },
          {
            type: "div",
            props: {
              style: {
                marginTop: "32px",
                paddingTop: "16px",
                borderTop: "1px solid #1a1a1a",
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "Inter",
                fontSize: "13px",
                letterSpacing: "3px",
                color: "#5a4a1a",
                textTransform: "uppercase",
              },
              children: [
                { type: "span", props: { children: "Featured in today's edition" } },
                { type: "span", props: { style: { fontFamily: "DM Serif Display", fontSize: "36px", color: "#8b6914", letterSpacing: 0 }, children: "D" } },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

export async function renderEditionOG({ headline, edition_date, role }) {
  const fonts = await loadFonts();
  const date = edition_date
    ? new Date(edition_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).toUpperCase()
    : "TODAY'S EDITION";

  const safeHeadline = (headline || "Today in tech").slice(0, 180);

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fdfaf2",
          padding: "60px 80px",
          fontFamily: "DM Serif Display",
          position: "relative",
        },
        children: [
          // top double rule
          {
            type: "div",
            props: {
              style: {
                borderTop: "2px solid #1a1a1a",
                borderBottom: "1px solid #1a1a1a",
                height: "8px",
                marginBottom: "24px",
              },
            },
          },
          // eyebrow row
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "Inter",
                fontSize: "16px",
                letterSpacing: "5px",
                color: "#8b6914",
                textTransform: "uppercase",
                marginBottom: "8px",
              },
              children: [
                { type: "span", props: { children: "Dispatch · Tech" } },
                { type: "span", props: { children: date } },
              ],
            },
          },
          // gold rule
          {
            type: "div",
            props: {
              style: { borderTop: "2px solid #8b6914", marginTop: "24px", marginBottom: "44px" },
            },
          },
          // headline
          {
            type: "div",
            props: {
              style: {
                fontFamily: "DM Serif Display",
                fontSize: safeHeadline.length > 110 ? "52px" : safeHeadline.length > 70 ? "62px" : "76px",
                lineHeight: 1.08,
                color: "#1a1a1a",
                display: "flex",
                flex: 1,
              },
              children: safeHeadline,
            },
          },
          // bottom strip
          {
            type: "div",
            props: {
              style: {
                marginTop: "44px",
                paddingTop: "20px",
                borderTop: "1px solid #1a1a1a",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "Inter",
                fontSize: "14px",
                letterSpacing: "3px",
                color: "#5a4a1a",
                textTransform: "uppercase",
              },
              children: [
                { type: "span", props: { children: '"All the bits fit to print"' } },
                {
                  type: "span",
                  props: {
                    style: { fontFamily: "DM Serif Display", fontSize: "44px", color: "#8b6914", letterSpacing: 0 },
                    children: "D",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts }
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}
