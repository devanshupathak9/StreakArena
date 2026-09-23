import Scenery from "./ui/Scenery";

/** The wide card under Today's progress: the same artwork, cropped tight. */
export default function QuoteTile() {
  return (
    <section className="quote-tile">
      <Scenery variant="banner" />
      <div className="quote-body">
        <blockquote>Consistency is a superpower.</blockquote>
        <span className="quote-rule" aria-hidden="true" />
      </div>
    </section>
  );
}
