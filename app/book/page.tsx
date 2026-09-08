import { BookingFlow } from "@/components/booking/BookingFlow";
import { BrandBar } from "@/components/BrandBar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a Cleaning — Uinta Ice Co",
};

export default function BookPage() {
  return (
    <>
      <BrandBar />
      <main className="page">
        <BookingFlow />
      </main>
    </>
  );
}
