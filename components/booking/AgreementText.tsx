// Renders the Service Agreement as semantic HTML from the single source of
// truth in lib/agreement.ts. Presentational only — the scroll gate, checkbox,
// and acceptance live in AgreementStep.
//
// Heading levels start at <h2>: the booking step owns the page <h1>.

import { SERVICE_AGREEMENT_BLOCKS } from "@/lib/agreement";

const displayFont =
  'var(--font-display), "Trebuchet MS", "Gill Sans", system-ui, sans-serif';

export function AgreementText() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        fontSize: 15,
        lineHeight: 1.7,
        color: "var(--color-fg)",
      }}
    >
      {SERVICE_AGREEMENT_BLOCKS.map((block, i) => {
        switch (block.kind) {
          case "title":
            return (
              <h2
                key={i}
                style={{
                  fontFamily: displayFont,
                  fontSize: 20,
                  letterSpacing: "0.04em",
                  margin: "0",
                }}
              >
                {block.text}
              </h2>
            );
          case "subtitle":
            return (
              <p
                key={i}
                style={{
                  margin: "0 0 var(--space-2)",
                  fontWeight: 600,
                  color: "var(--color-fg)",
                }}
              >
                {block.text}
              </p>
            );
          case "intro":
            return (
              <p key={i} style={{ margin: 0 }}>
                {block.text}
              </p>
            );
          case "heading":
            return (
              <h3
                key={i}
                style={{
                  fontFamily: displayFont,
                  fontSize: 15,
                  letterSpacing: "0.03em",
                  margin: "var(--space-3) 0 0",
                }}
              >
                {block.text}
              </h3>
            );
          case "paragraph":
            return (
              <p key={i} style={{ margin: 0 }}>
                {block.text}
              </p>
            );
          default: {
            // Exhaustiveness guard — a new block kind won't silently render blank.
            const _never: never = block;
            return _never;
          }
        }
      })}
    </div>
  );
}
