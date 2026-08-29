import { ContactForm, type ContactPrefill } from "@/components/contact/ContactForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact Us — Uinta Ice Co",
};

export default function ContactPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? "");
  const prefill: ContactPrefill = {
    name: str(searchParams.name),
    email: str(searchParams.email),
    phone: str(searchParams.phone),
    address: str(searchParams.address),
    brand: str(searchParams.brand),
    model: str(searchParams.model),
    from: str(searchParams.from),
  };

  return (
    <main className="page">
      <ContactForm prefill={prefill} />
    </main>
  );
}
