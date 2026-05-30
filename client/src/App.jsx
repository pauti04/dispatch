import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./routes/Landing.jsx";
import Demo from "./routes/Demo.jsx";
import NotFound from "./routes/NotFound.jsx";
import Shortcuts from "./components/Shortcuts.jsx";
import Shimmer from "./components/Shimmer.jsx";

// Landing + Demo + NotFound stay in the main bundle:
//   - Landing  — front door, hit by ~every visitor
//   - Demo     — primary CTA destination from Landing + Showcase; the
//                marketing payoff page. Eager-loading avoids an extra
//                chunk fetch on the page recruiters most want to see.
//   - NotFound — catch-all, tiny.
//
// Everything else is code-split per route. Cuts the initial bundle ~35%
// vs no-split while keeping Demo's TTI fast.
const Try         = lazy(() => import("./routes/Try.jsx"));
const Signup      = lazy(() => import("./routes/Signup.jsx"));
const Verify      = lazy(() => import("./routes/Verify.jsx"));
const Account     = lazy(() => import("./routes/Account.jsx"));
const Edition     = lazy(() => import("./routes/Edition.jsx"));
const Archive     = lazy(() => import("./routes/Archive.jsx"));
const Saved       = lazy(() => import("./routes/Saved.jsx"));
const Invite      = lazy(() => import("./routes/Invite.jsx"));
const Streak      = lazy(() => import("./routes/Streak.jsx"));
const Today       = lazy(() => import("./routes/Today.jsx"));
const Referrals   = lazy(() => import("./routes/Referrals.jsx"));
const Teaser      = lazy(() => import("./routes/Teaser.jsx"));
const Search      = lazy(() => import("./routes/Search.jsx"));
const Discover    = lazy(() => import("./routes/Discover.jsx"));
const Privacy     = lazy(() => import("./routes/Privacy.jsx"));
const Terms       = lazy(() => import("./routes/Terms.jsx"));
const About       = lazy(() => import("./routes/About.jsx"));
const Manifesto   = lazy(() => import("./routes/Manifesto.jsx"));
const Press       = lazy(() => import("./routes/Press.jsx"));
const SayHi       = lazy(() => import("./routes/SayHi.jsx"));
const Early       = lazy(() => import("./routes/Early.jsx"));
const Changelog   = lazy(() => import("./routes/Changelog.jsx"));
const Unsubscribe = lazy(() => import("./routes/Unsubscribe.jsx"));
const Admin       = lazy(() => import("./routes/Admin.jsx"));
const Showcase    = lazy(() => import("./routes/Showcase.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main" className="skip-to-content">Skip to content</a>
      <Shortcuts />
      <Suspense fallback={<Shimmer subscript="Loading…" />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/try" element={<Try />} />
          <Route path="/signup" element={<Signup mode="signup" />} />
          <Route path="/login" element={<Signup mode="login" />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/account" element={<Account />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/edition/:slug" element={<Edition />} />
          <Route path="/i/:token" element={<Invite />} />
          <Route path="/streak" element={<Streak />} />
          <Route path="/today" element={<Today />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/search" element={<Search />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/finance" element={<Teaser publicationId="finance" />} />
          <Route path="/design" element={<Teaser publicationId="design" />} />
          <Route path="/ai-research" element={<Teaser publicationId="ai-research" />} />
          <Route path="/cybersecurity-weekly" element={<Teaser publicationId="cybersecurity-weekly" />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/about" element={<About />} />
          <Route path="/manifesto" element={<Manifesto />} />
          <Route path="/press" element={<Press />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/say-hi" element={<SayHi />} />
          <Route path="/early" element={<Early />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
