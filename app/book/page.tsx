import { BookingFlow } from "@/components/booking/BookingFlow";
import { BrandBar } from "@/components/BrandBar";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a Cleaning — Uinta Ice Co",
};

export default async function BookPage() {
  let basePriceCents: number | null = null;
  let commercialPriceCents: number | null = null;
  try {
    const settings = await getSettings();
    basePriceCents = settings.base_price_cents;
    commercialPriceCents = settings.commercial_price_cents;
  } catch {
    // ServiceTypeStep tolerates nulls (omits the price line) rather than
    // blocking booking entirely on a settings-fetch hiccup.
  }

  return (
    <>
      <BrandBar />
      <main className="page">
        <BookingFlow basePriceCents={basePriceCents} commercialPriceCents={commercialPriceCents} />
      </main>
    </>
  );
}
