import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./routes/Landing.jsx";
import Try from "./routes/Try.jsx";
import Signup from "./routes/Signup.jsx";
import Verify from "./routes/Verify.jsx";
import Account from "./routes/Account.jsx";
import Edition from "./routes/Edition.jsx";
import Archive from "./routes/Archive.jsx";
import Saved from "./routes/Saved.jsx";
import Invite from "./routes/Invite.jsx";
import Streak from "./routes/Streak.jsx";
import Today from "./routes/Today.jsx";
import Referrals from "./routes/Referrals.jsx";
import Teaser from "./routes/Teaser.jsx";
import Search from "./routes/Search.jsx";
import Discover from "./routes/Discover.jsx";
import Privacy from "./routes/Privacy.jsx";
import Terms from "./routes/Terms.jsx";
import About from "./routes/About.jsx";
import Manifesto from "./routes/Manifesto.jsx";
import Press from "./routes/Press.jsx";
import Demo from "./routes/Demo.jsx";
import SayHi from "./routes/SayHi.jsx";
import Early from "./routes/Early.jsx";
import Changelog from "./routes/Changelog.jsx";
import NotFound from "./routes/NotFound.jsx";
import Unsubscribe from "./routes/Unsubscribe.jsx";
import Shortcuts from "./components/Shortcuts.jsx";
import Admin from "./routes/Admin.jsx";
import Showcase from "./routes/Showcase.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <a href="#main" className="skip-to-content">Skip to content</a>
      <Shortcuts />
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
    </BrowserRouter>
  );
}
