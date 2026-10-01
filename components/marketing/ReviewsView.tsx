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
// Author photos are plain <img>, not next/image: the image optimizer would
// cache Google content, which the terms don't allow.
export function ReviewsView({ reviews }: { reviews: GoogleReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <div className="mkt-reviews" data-cols={columnsFor(reviews.length)}>
      <h3 className="mkt-reviews__title">What Customers Say</h3>
      <ul className="mkt-reviews__list">
        {reviews.map((r, i) => (
          <li className="mkt-review" key={`${r.authorName}-${i}`}>
            <Stars />
            <blockquote className="mkt-review__text">
              <p>{r.text}</p>
            </blockquote>
            {r.translated && <p className="mkt-review__note">Translated by Google</p>}
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
          </li>
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

// Column count by review count, so a short list never leaves a lopsided gap:
// 1 → one card, 2 and 4 → two columns (2×2 rather than 3+1), otherwise three
// (3, or 5 → 3+2). Up to MAX_REVIEWS (5) wraps cleanly.
function columnsFor(n: number): 1 | 2 | 3 {
  if (n <= 1) return 1;
  return n === 2 || n === 4 ? 2 : 3;
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
        width={36}
        height={36}
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
