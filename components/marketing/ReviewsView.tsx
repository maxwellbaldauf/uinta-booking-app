"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { GoogleReview } from "@/lib/googleReviews";

// The Google reviews block shown inside the home page's pricing section.
// Purely presentational: it renders whatever reviews it is handed and nothing
// else. The data arrives via LazyGoogleReviews (client; fetches /api/reviews
// when the visitor scrolls near the section) or, in dev, the ?reviewsPreview
// placeholders. Renders NOTHING for an empty list: an absent block is always
// better than a broken one.
//
// Attribution, per the Places API policies
// (developers.google.com/maps/documentation/places/web-service/policies):
//  - each review: author avatar, name, and profile link; the relative publish
//    date, which is also the link to the review on Google Maps (googleMapsUri
//    access is a "must"); a "translated" note when Google translated it.
//    No visible "View on Google Maps" / "Report" row, by Max's call - the
//    report link (flagContentUri) is only "recommended", and reporting is
//    still available on the review's Google Maps page.
//  - the Google Maps logo (official asset, unmodified, 18px tall - inside the
//    16-19px range - with the required clear space, translate="no")
//  - a one-line, deliberately quiet caption beside the logo saying the
//    reviews are 5-star and newest first - the policy's required "how reviews
//    are ordered and filtered" notice, kept to a few faint words.
// Layout: one slim row of cards (about three visible on desktop, swipe on
// mobile with the next card peeking), scrolling sideways via scroll-snap and
// prev/next buttons when there are more. Review text is clamped to ~3 lines
// with a "Read more" button; the full text is always in the DOM unchanged.
// Author photos are plain <img>, not next/image: the image optimizer would
// cache Google content, which the terms don't allow.
export function ReviewsView({ reviews }: { reviews: GoogleReview[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ overflow: false, atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    setEdges({
      overflow,
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, reviews.length]);

  if (reviews.length === 0) return null;

  // One card plus the gap, so a button press moves exactly one card.
  const page = (dir: 1 | -1) => {
    const el = listRef.current;
    const card = el?.querySelector<HTMLElement>(".mkt-review");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: "smooth" });
  };

  return (
    <div className="mkt-reviews" data-cols={columnsFor(reviews.length)}>
      <div className="mkt-reviews__head">
        <h3 className="mkt-reviews__title">What Customers Say</h3>
        {edges.overflow && (
          <div className="mkt-reviews__nav">
            <button
              type="button"
              className="mkt-reviews__btn"
              onClick={() => page(-1)}
              disabled={edges.atStart}
              aria-label="Previous reviews"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              className="mkt-reviews__btn"
              onClick={() => page(1)}
              disabled={edges.atEnd}
              aria-label="Next reviews"
            >
              <Chevron dir="right" />
            </button>
          </div>
        )}
      </div>
      <ul className="mkt-reviews__list" ref={listRef} onScroll={measure}>
        {reviews.map((r, i) => (
          <ReviewCard review={r} key={`${r.authorName}-${i}`} />
        ))}
      </ul>
      <div className="mkt-reviews__attrib">
        <picture className="mkt-reviews__logo" translate="no">
          <source
            srcSet="/images/google-maps-logo-white.svg"
            media="(prefers-color-scheme: dark)"
          />
          {/* Official attribution asset — rendered unmodified. */}
          <img src="/images/google-maps-logo-dark-gray.svg" alt="Google Maps" width={98} height={18} />
        </picture>
        <p className="mkt-reviews__notice">5-star reviews, newest first.</p>
      </div>
    </div>
  );
}

function ReviewCard({ review: r }: { review: GoogleReview }) {
  const textId = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  // "Read more" only appears when the text actually exceeds three lines.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const check = () => {
      if (!expanded) setClamped(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, r.text]);

  return (
    <li className="mkt-review">
      <div className="mkt-review__author">
        <Avatar review={r} />
        <div className="mkt-review__who">
          {r.authorUri ? (
            <a href={r.authorUri} rel="noopener noreferrer nofollow" target="_blank">
              {r.authorName}
            </a>
          ) : (
            <span>{r.authorName}</span>
          )}
          {r.relativeTime &&
            (r.googleMapsUri ? (
              // The date doubles as the required link to the review on
              // Google Maps — no separate visible "View on Google Maps".
              <a
                className="mkt-review__when"
                href={r.googleMapsUri}
                rel="noopener noreferrer nofollow"
                target="_blank"
                aria-label={`${r.relativeTime} — view this review on Google Maps`}
              >
                {r.relativeTime}
              </a>
            ) : (
              <span className="mkt-review__when">{r.relativeTime}</span>
            ))}
        </div>
      </div>
      <Stars />
      <blockquote className="mkt-review__text">
        <p
          id={textId}
          ref={textRef}
          className={expanded ? undefined : "mkt-review__clamp"}
        >
          {r.text}
        </p>
      </blockquote>
      {(clamped || expanded) && (
        <button
          type="button"
          className="mkt-review__more"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      {r.translated && <p className="mkt-review__note">Translated by Google</p>}
    </li>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
      <path
        d={dir === "left" ? "M12.5 3.5L6 10l6.5 6.5" : "M7.5 3.5L14 10l-6.5 6.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Cards visible at once on desktop: one per review up to three. A single row
// scrolls sideways when there are more.
function columnsFor(n: number): 1 | 2 | 3 {
  return Math.min(3, Math.max(1, n)) as 1 | 2 | 3;
}

function Stars() {
  return (
    <span className="mkt-review__stars" role="img" aria-label="Rated 5 out of 5">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
          />
        </svg>
      ))}
    </span>
  );
}

function Avatar({ review }: { review: GoogleReview }) {
  if (review.authorPhotoUri) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- next/image would cache Google content (see header)
      <img
        className="mkt-review__avatar"
        src={review.authorPhotoUri}
        alt=""
        width={32}
        height={32}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span className="mkt-review__avatar mkt-review__avatar--initial" aria-hidden="true">
      {review.authorName.charAt(0).toUpperCase()}
    </span>
  );
}
