export default function PullQuote({ text }) {
  if (!text) return null;
  return (
    <figure className="pull-quote my-12">
      <span className="pull-quote-mark" aria-hidden>
        “
      </span>
      <blockquote className="pull-quote-text">{text}</blockquote>
    </figure>
  );
}
