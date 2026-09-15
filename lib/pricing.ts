// Ported from uinta-field-app/lib/pricing.ts (the two repos don't import
// each other's code — see lib/tokens.ts's header comment for the same
// rationale) so the pre-visit reminder email can show the same effective
// price the field app would quote: a property's custom_price_cents override
// when set, regardless of service_type, otherwise the tier default. Every
// site that looks up a property's price goes through this rather than
// re-deriving the tier ternary locally, in both repos now — that duplication
// is exactly how a property could show the right price in one place and the
// wrong one in another once custom_price_cents exists.

export type PricedProperty = {
  service_type: "residential" | "commercial";
  custom_price_cents: number | null;
};

export type TierPrices = {
  basePriceCents: number;
  commercialPriceCents: number;
};

export function getEffectivePriceCents(
  property: PricedProperty,
  tiers: TierPrices
): number {
  if (property.custom_price_cents != null) return property.custom_price_cents;
  return property.service_type === "commercial"
    ? tiers.commercialPriceCents
    : tiers.basePriceCents;
}
