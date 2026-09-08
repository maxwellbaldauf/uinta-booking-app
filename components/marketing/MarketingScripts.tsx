"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Progressive enhancement for the marketing pages. Everything works without
// this — <details> toggles natively, anchor links jump natively. This adds:
//  - a smooth height animation on accordion open/close (skipped for
//    prefers-reduced-motion and where Element.animate is unavailable)
//  - opening the target <details> when a jump-nav link or an inbound #hash
//    points at a collapsed section, and re-aligning the scroll on load
//  - a fade-up as sections scroll into view
//
// The (marketing) layout persists across route-group navigations, so this
// effect is keyed on the pathname: it tears down and rebuilds for each page,
// which is also what makes an in-app deep link like /troubleshooting#how-often
// open the target accordion.
export function MarketingScripts() {
  const pathname = usePathname();

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const cleanups: Array<() => void> = [];

    // Resolve an inbound hash up front so the reveal never hides the section
    // we're landing on.
    const hashId = window.location.hash.replace(/^#/, "");
    const hashTarget = hashId ? document.getElementById(hashId) : null;

    // ---- Accordion height animation ----
    const CLOSE_MS = 200;
    const OPEN_MS = 220;
    document
      .querySelectorAll<HTMLDetailsElement>(".mkt-acc__item")
      .forEach((details) => {
        const summary = details.querySelector<HTMLElement>(".mkt-acc__summary");
        const panel = details.querySelector<HTMLElement>(".mkt-acc__panel");
        if (!summary || !panel) return;

        let closeTimer = 0;

        const onClick = (event: MouseEvent) => {
          if (prefersReduced || typeof panel.animate !== "function") return;
          event.preventDefault();
          // drop anything in flight so rapid clicks don't stack
          window.clearTimeout(closeTimer);
          panel.getAnimations().forEach((a) => a.cancel());

          if (details.open) {
            const from = panel.offsetHeight;
            panel.animate(
              { height: [`${from}px`, "0px"], opacity: [1, 0] },
              { duration: CLOSE_MS, easing: "ease-out" },
            );
            // hide just before the animation ends, so <details> collapses the
            // panel before the fill reverts — no flash of the full height
            closeTimer = window.setTimeout(() => {
              details.open = false;
            }, CLOSE_MS - 10);
          } else {
            details.open = true;
            const to = panel.offsetHeight;
            panel.animate(
              { height: ["0px", `${to}px`], opacity: [0, 1] },
              { duration: OPEN_MS, easing: "ease-out" },
            );
          }
        };

        summary.addEventListener("click", onClick);
        cleanups.push(() => {
          summary.removeEventListener("click", onClick);
          window.clearTimeout(closeTimer);
        });
      });

    // ---- Open + align to an inbound #hash on load ----
    if (hashTarget) {
      if (hashTarget instanceof HTMLDetailsElement) hashTarget.open = true;
      // the browser's own hash scroll can run before the panel expands
      requestAnimationFrame(() => {
        hashTarget.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }

    // ---- Open the <details> a jump link points at (browser handles the scroll) ----
    const openById = (id: string) => {
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement && !el.open) el.open = true;
      return el;
    };

    const onDocClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      if (link) openById((link.getAttribute("href") ?? "").replace(/^#/, ""));
    };
    document.addEventListener("click", onDocClick);
    cleanups.push(() => document.removeEventListener("click", onDocClick));

    // hash changes without a remount (back/forward, same-page links)
    const onHashChange = () => {
      const el = openById(window.location.hash.replace(/^#/, ""));
      if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
    };
    window.addEventListener("hashchange", onHashChange);
    cleanups.push(() => window.removeEventListener("hashchange", onHashChange));

    // ---- Fade sections up as they enter — skipped when deep-linking, so the
    //      landing section is visible immediately ----
    if (!hashTarget && !prefersReduced && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      document
        .querySelectorAll<HTMLElement>(".mkt-section, .mkt-trustbar")
        .forEach((el) => {
          // only hide what starts below the fold, so on-screen content never flashes
          if (el.getBoundingClientRect().top > window.innerHeight) {
            el.classList.add("mkt-reveal");
            io.observe(el);
          }
        });
      cleanups.push(() => io.disconnect());
    }

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
