"use client";

import { useEffect, useRef, useState } from "react";
import type { GoogleReview } from "@/lib/googleReviews";
import { ReviewsView } from "./ReviewsView";

// Loads the Google reviews only when the visitor scrolls within ~800px of this
// spot in the pricing section, instead of on every page load. Google bills
// each reviews lookup, so this keeps bots, bounces, and anyone who never gets
// near pricing from costing a call. Nothing is fetched at page load; the
// sentinel below is a 1px spacer that only exists to be observed.
//
// Talks to our own /api/reviews (server-side, holds the key and the rate
// limit), never to Google directly, and keeps nothing in browser storage —
// the reviews live in component state for this page view only, so a fresh
// visit asks again (Google's terms don't allow storing them).
export function LazyGoogleReviews() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<GoogleReview[] | null>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const controller = new AbortController();
    let started = false;

    async function load() {
      if (started) return;
      started = true;
      try {
        const res = await fetch("/api/reviews", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { reviews?: GoogleReview[] };
        if (Array.isArray(data.reviews)) setReviews(data.reviews);
      } catch {
        // Aborted, offline, or the API failed — the block just stays absent.
      }
    }

    if (!("IntersectionObserver" in window)) {
      void load();
      return () => controller.abort();
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void load();
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      controller.abort();
    };
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" style={{ height: 1 }} />
      {reviews && reviews.length > 0 && <ReviewsView reviews={reviews} />}
    </>
  );
}
