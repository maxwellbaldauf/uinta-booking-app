import { GOOGLE_PROFILE_URL } from "@/lib/site";

// Link-only "Reviewed on Google" badge, shown directly under the home page
// hero. Deliberately static: no Places API call, no review text, no rating
// number. (Live reviews cost a billed call per visit and Google's terms don't
// allow caching them, so the live block stays down in the pricing section.)
// The five stars are decorative; the whole badge is one link to the Google
// Business Profile. Its height is fixed in CSS so nothing shifts around it.
export function GoogleBadge() {
  return (
    <div className="mkt-gbadge">
      <a
        className="mkt-gbadge__link"
        href={GOOGLE_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Uinta Ice Company reviews on Google (opens in a new tab)"
      >
        <span className="mkt-gbadge__stars" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} viewBox="0 0 20 20" width="16" height="16" focusable="false">
              <path
                fill="currentColor"
                d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
              />
            </svg>
          ))}
        </span>
        <span className="mkt-gbadge__label" translate="no">
          Reviewed on Google
        </span>
      </a>
    </div>
  );
}
