import { ContactForm, type ContactPrefill } from "@/components/contact/ContactForm";
import { BrandBar } from "@/components/BrandBar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact Us — Uinta Ice Co",
};

export default async function ContactPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited (matches
  // /visit/[token] and /pay/[token]).
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? "");
  const prefill: ContactPrefill = {
    name: str(sp.name),
    email: str(sp.email),
    phone: str(sp.phone),
    address: str(sp.address),
    brand: str(sp.brand),
    model: str(sp.model),
    from: str(sp.from),
  };

  return (
    <>
      <BrandBar />
      <main className="page">
        <ContactForm prefill={prefill} />
      </main>
    </>
  );
}
