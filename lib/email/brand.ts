// This deployment's business identity for every email it sends: the name in
// subjects/bodies/signature, the header/button accent, the reply-to address,
// and the calendar-invite identity. From the businesses row (getBusiness()),
// so a Camelback deployment can never send anything branded Uinta.
//
// Relative imports: reachable from netlify/functions/pre-visit-reminders.mts.
import { getBusiness } from "../tenant/business";

export type EmailBrand = {
  name: string;
  accent: string;
  replyTo: string | null;
  icsProdId: string;
  icsUidDomain: string;
  icsSummary: string;
  icsFilename: string;
};

export async function getEmailBrand(): Promise<EmailBrand> {
  const b = await getBusiness();
  return {
    name: b.name,
    accent: b.accent_color,
    replyTo: b.reply_to,
    icsProdId: `-//${b.name}//Booking//EN`,
    icsUidDomain: b.ics_domain,
    icsSummary: `${b.name} — ice machine cleaning`,
    icsFilename: `${b.slug}-ice-visit.ics`,
  };
}
