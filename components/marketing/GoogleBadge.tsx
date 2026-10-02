import { GOOGLE_PROFILE_URL } from "@/lib/site";

// Link-only "Reviewed on Google" item, the first entry in the home page trust
// strip. Deliberately static: no Places API call, no review text, no rating
// number. (Live reviews cost a billed call per visit and Google's terms don't
// allow caching them, so the live block stays down in the pricing section.)
// The five stars are decorative; the whole item is one link to the Google
// Business Profile. Sized and coloured by the strip (1em stars, inherited
// colour); renders just the <a>, the caller supplies the <li>.
export function GoogleBadge() {
  return (
    <a
      className="mkt-gbadge"
      href={GOOGLE_PROFILE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Reviewed on Google: Uinta Ice Company (opens in a new tab)"
    >
      <span className="mkt-gbadge__stars" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} viewBox="0 0 20 20" width="1em" height="1em" focusable="false">
            <path
              fill="currentColor"
              d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
            />
          </svg>
        ))}
      </span>
      <span>
        Reviewed on{" "}
        <span className="mkt-gbadge__google" translate="no">
          Google
        </span>
      </span>
    </a>
  );
}
