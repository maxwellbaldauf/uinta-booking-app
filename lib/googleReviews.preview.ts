import type { GoogleReview } from "@/lib/googleReviews";

// DEV ONLY — placeholder reviews for previewing the reviews block layout
// (/?reviewsPreview=0..5) before the server key exists, and for checking the
// small/zero-count cases. Never rendered in production: the home page only
// reads ?reviewsPreview when isDev(). Obviously-fake names and text on
// purpose — these must never be mistaken for real customer reviews.
const SAMPLE_TEXTS = [
  "Sample review text. Layout placeholder only — the live site shows real Google reviews here.",
  "Sample review text of a longer length, to check how a card with several lines of copy sits next to a shorter one in the same row. Placeholder only.",
  "Short sample review. Placeholder only.",
  "Sample review text. Placeholder only — checks that a fourth card wraps onto a second row cleanly.",
  "Sample review text. Placeholder only — the fifth card, the most Google returns in one request.",
  "Sample review text. Placeholder only — a sixth card, to check the layout at the display cap.",
  "Sample review text of a longer length, placeholder only — the seventh and final card, which should wrap onto a third row alone without leaving an ugly gap.",
];

export function previewReviews(count: number): GoogleReview[] {
  return SAMPLE_TEXTS.slice(0, Math.max(0, Math.min(5, count))).map((text, i) => ({
    authorName: `Sample Reviewer ${String.fromCharCode(65 + i)}`,
    authorUri: "https://www.google.com/maps",
    authorPhotoUri: null,
    rating: 5,
    text,
    translated: i === 2,
    relativeTime: `${i + 1} month${i ? "s" : ""} ago`,
    publishedAt: Date.now() - (i + 1) * 30 * 86_400_000,
    googleMapsUri: "https://www.google.com/maps",
  }));
}
