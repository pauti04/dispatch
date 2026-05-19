import { Link } from "react-router-dom";
import NavDrawer from "./NavDrawer.jsx";

const EPOCH = new Date("2026-01-01T00:00:00Z").getTime();

function readStreak() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("dispatch.streak.v1") || "null");
  } catch {
    return null;
  }
}

function todayLong() {
  return new Date()
    .toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

function editionNumber() {
  const days = Math.floor((Date.now() - EPOCH) / 86_400_000);
  return String(days).padStart(4, "0");
}

function timeOfDay() {
  return new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function Masthead({ subscript, leftLine }) {
  const streak = readStreak();
  return (
    <header className="border-b border-rule relative">
      <NavDrawer />
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="kicker">Vol. I · No. {editionNumber()}</div>
          <div className="kicker">{todayLong()}</div>
          <div className="flex items-center gap-3">
            {streak?.streak > 1 && (
              <Link to="/streak" className="streak-chip" title="See your reading streak">
                <span className="streak-chip-flame">▲</span> Day {streak.streak}
              </Link>
            )}
            <div className="kicker">Edition {timeOfDay()}</div>
          </div>
        </div>
        <hr className="rule mt-3" />
        <h1 className="masthead-title text-[5rem] md:text-[8rem] text-center leading-none mt-4 mb-1">
          Dispatch
        </h1>
        <hr className="rule-double mt-4" />
        <div className="flex items-center justify-between gap-4 flex-wrap mt-3">
          <p className="kicker">{leftLine || " "}</p>
          <p className="kicker">{subscript}</p>
          <p className="kicker">"The wire, edited."</p>
        </div>
      </div>
    </header>
  );
}
