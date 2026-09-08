"use client";

import { useEffect } from "react";

// Progressive enhancement for the marketing pages. Everything works without
// this — <details> toggles natively, anchor links jump natively. This adds:
//  - a smooth height animation on accordion open/close (skipped for
//    prefers-reduced-motion and where Element.animate is unavailable)
//  - opening the target <details> when a jump-nav link or an inbound #hash
//    points at a collapsed section
export function MarketingScripts() {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const cleanups: Array<() => void> = [];

    // ---- Accordion height animation ----
    const items = document.querySelectorAll<HTMLDetailsElement>(
      ".mkt-acc__item",
    );
    items.forEach((details) => {
      const summary = details.querySelector<HTMLElement>(".mkt-acc__summary");
      const panel = details.querySelector<HTMLElement>(".mkt-acc__panel");
      if (!summary || !panel) return;

      const onClick = (event: MouseEvent) => {
        if (prefersReduced || typeof panel.animate !== "function") return;
        event.preventDefault();

        if (details.open) {
          const from = panel.offsetHeight;
          const anim = panel.animate(
            { height: [`${from}px`, "0px"], opacity: [1, 0] },
            { duration: 200, easing: "ease-out" },
          );
          anim.onfinish = () => {
            details.open = false;
            panel.style.height = "";
            panel.style.opacity = "";
          };
        } else {
          details.open = true;
          const to = panel.offsetHeight;
          panel.animate(
            { height: ["0px", `${to}px`], opacity: [0, 1] },
            { duration: 220, easing: "ease-out" },
          );
        }
      };

      summary.addEventListener("click", onClick);
      cleanups.push(() => summary.removeEventListener("click", onClick));
    });

    // ---- Open the <details> a hash points at ----
    const openTarget = (rawHash: string) => {
      const id = rawHash.replace(/^#/, "");
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement && !el.open) el.open = true;
    };

    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      if (link) openTarget(link.getAttribute("href") ?? "");
    };
    document.addEventListener("click", onDocClick);
    cleanups.push(() => document.removeEventListener("click", onDocClick));

    openTarget(window.location.hash);

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
