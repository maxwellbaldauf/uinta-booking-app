import { BookingFlow } from "@/components/booking/BookingFlow";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a Cleaning — Uinta Ice Co",
};

export default function BookPage() {
  return (
    <main className="page">
      <BookingFlow />
    </main>
  );
}
