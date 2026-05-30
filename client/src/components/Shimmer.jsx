import Masthead from "./Masthead.jsx";

export default function Shimmer({ subscript = "Composing today's edition…" }) {
  return (
    <>
      <Masthead subscript={subscript} />
      <main id="main" tabIndex={-1} className="max-w-6xl mx-auto px-6 py-10">
        <div className="shimmer h-16 w-3/4 mx-auto mb-3" />
        <div className="shimmer h-4 w-1/3 mx-auto mb-12" />
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3 pb-6 border-b border-rule">
              <div className="shimmer h-3 w-20" />
              <div className="shimmer h-6 w-full" />
              <div className="shimmer h-4 w-11/12" />
              <div className="shimmer h-4 w-3/4" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
