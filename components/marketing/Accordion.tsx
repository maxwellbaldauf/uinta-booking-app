import type { ReactNode } from "react";

// Server-rendered accordion. Every panel's content ships in the HTML and is
// collapsed with CSS — nothing is loaded on click — so crawlers and AI answer
// engines that read the raw response see all of it. MarketingScripts adds the
// open/close height animation on top of the native <details> behavior.

export function Accordion({ children }: { children: ReactNode }) {
  return <div className="mkt-acc">{children}</div>;
}

export function AccordionItem({
  id,
  summary,
  defaultOpen = false,
  headingLevel = 3,
  children,
}: {
  /** stable anchor id, so jump-nav links and inbound #hash can target it */
  id?: string;
  summary: string;
  defaultOpen?: boolean;
  /** heading level for the summary title, so the page outline stays logical */
  headingLevel?: 2 | 3;
  children: ReactNode;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <details
      className="mkt-acc__item"
      id={id}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="mkt-acc__summary">
        <Heading className="mkt-acc__title">{summary}</Heading>
        <span className="mkt-acc__icon" aria-hidden="true" />
      </summary>
      <div className="mkt-acc__panel">
        <div className="mkt-acc__panel-inner">{children}</div>
      </div>
    </details>
  );
}
