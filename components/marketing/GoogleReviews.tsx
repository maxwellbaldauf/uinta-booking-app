import { after } from "next/server";
import { fetchFiveStarReviews, type GoogleReview } from "@/lib/googleReviews";
import { recordReviewsFetch } from "@/lib/googleReviewsHealth";

// Live 5-star Google reviews, rendered inside the home page's pricing section.
// Async server component — the home page wraps it in <Suspense fallback={null}>
// so a slow Google response streams in late instead of holding up the page.
// Renders NOTHING when there are no 5-star reviews, the fetch fails, or the
// feature isn't configured: an absent block is always better than a broken one.
//
// Attribution, per the Places API policies
// (developers.google.com/maps/documentation/places/web-service/policies):
//  - each review: author avatar, name, and profile link; the relative publish
//    date, which is also the link to the review on Google Maps (googleMapsUri
//    access is a "must"); a "translated" note when Google translated it.
//    No visible "View on Google Maps" / "Report" row, by Max's call — the
//    report link (flagContentUri) is only "recommended", and reporting is
//    still available on the review's Google Maps page.
//  - the Google Maps logo (official asset, unmodified, 18px tall — inside the
//    16–19px range — with the required clear space, translate="no")
//  - a notice saying how the reviews are filtered and ordered (required when
//    filtering; we show 5-star only)
// Author photos are plain <img>, not next/image: the image optimizer would
// cache Google content, which the terms don't allow.
export async function GoogleReviews({ preview }: { preview?: GoogleReview[] }) {
  let reviews: GoogleReview[];
  if (preview) {
    reviews = preview;
  } else {
    const result = await fetchFiveStarReviews();
    if (result.status === "unconfigured") return null;
    after(() =>
      recordReviewsFetch(
        result.status === "ok" ? { ok: true } : { ok: false, detail: result.detail }
      )
    );
    if (result.status !== "ok") return null;
    reviews = result.reviews;
  }
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
        <p className="mkt-reviews__notice">
          5-star reviews only, newest first. Google shares up to five of a
          business’s reviews at a time.
        </p>
      </div>
    </div>
  );
}

// Column count by review count, so a short list never leaves a lopsided gap:
// 1 → one card, 2 and 4 → two columns (2×2 rather than 3+1), otherwise three
// (3, 5 → 3+2, 6, 7 → 3+3+1). Up to MAX_REVIEWS (7) wraps cleanly.
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
