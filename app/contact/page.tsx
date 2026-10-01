import { ContactForm } from "@/components/contact/ContactForm";
import { BrandBar } from "@/components/BrandBar";
import { LegalLinks } from "@/components/LegalLinks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact Us — Uinta Ice Co",
};

// No query-string prefill: personal data never goes in this URL. The booking
// dead end hands its details over through sessionStorage instead (see
// lib/contactHandoff.ts and ContactForm).
export default function ContactPage() {
  return (
    <>
      <BrandBar />
      <main className="page">
        <ContactForm />
      </main>
      <LegalLinks />
    </>
  );
}
