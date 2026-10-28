"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// The home page trust strip. Items come in as a plain list; anything null /
// false / empty is skipped, and so is any item that renders to nothing (a
// component that returns null), so a missing item never leaves a gap or a dot.
//
// On tablet and up the items wrap and a "·" separates neighbours on the same
// row. CSS alone can't tell which item starts a row, so after layout we mark
// every item that doesn't (data-sep) and only those get a dot; a row never
// starts or ends with one. We also narrow the list to the smallest width that
// keeps the same row count, so a wrap splits the items evenly instead of
// leaving a short last row. Below tablet it is a plain vertical list and none
// of this runs.
const WIDE = "(min-width: 48rem)";

export function TrustBar({ items }: { items: ReactNode[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const shown = items.filter((i) => i !== null && i !== undefined && i !== false && i !== "");

  useLayoutEffect(() => {
    const ul = ref.current;
    const bar = ul?.parentElement;
    if (!ul || !bar) return;
    const lis = Array.from(ul.children) as HTMLElement[];

    const layout = () => {
      ul.style.maxWidth = "";
      for (const li of lis) {
        li.hidden = !li.querySelector("*") && !li.textContent?.trim();
        delete li.dataset.sep;
      }
      if (!window.matchMedia(WIDE).matches) return;
      const vis = lis.filter((li) => !li.hidden);

      // Rows are centered, so a row's first item is found by position: it sits
      // below the item before it. (Same-row items overlap vertically.)
      const startsRow = (i: number) =>
        i > 0 && vis[i].offsetTop >= vis[i - 1].offsetTop + vis[i - 1].offsetHeight;
      const rows = () => vis.reduce((n, _, i) => n + (startsRow(i) ? 1 : 0), 1);

      // Balance the wrap: smallest width that still gives the same row count.
      const full = ul.clientWidth;
      const target = rows();
      if (target > 1) {
        let lo = Math.max(...vis.map((li) => li.offsetWidth));
        let hi = full;
        while (hi - lo > 2) {
          const mid = Math.floor((lo + hi) / 2);
          ul.style.maxWidth = `${mid}px`;
          if (rows() === target) hi = mid;
          else lo = mid;
        }
        ul.style.maxWidth = `${hi}px`;
      }

      vis.forEach((li, i) => {
        if (i > 0 && !startsRow(i)) li.dataset.sep = "";
      });
    };

    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(bar); // the strip's own width never depends on the list's max-width
    document.fonts?.ready.then(layout);
    return () => ro.disconnect();
  }, [shown.length]);

  return (
    <div className="mkt-trustbar">
      <ul ref={ref}>
        {shown.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
