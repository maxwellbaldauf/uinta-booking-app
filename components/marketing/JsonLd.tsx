// Renders a page's schema.org nodes as one JSON-LD script. `<` is escaped so a
// string value can never close the <script> tag early.
export function JsonLd({ graph }: { graph: Record<string, unknown>[] }) {
  const data = { "@context": "https://schema.org", "@graph": graph };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
