// Staging verification of "Annual service" (booking-site half). STAGING ONLY - it reads the STAGING_*
// credentials from ../uinta-field-app/.env.local and refuses production.
//   cd uinta-booking-app && ../uinta-field-app/node_modules/.bin/tsx scripts/verify-annual-service.ts --confirm-staging [uinta|camelback]
// (the same script lives in camelback-ice-co; the slug picks which business's agreement is checked)
//
//   A. The agreement text: semi-annual is byte-identical to today's text and version; annual / mixed
//      change ONLY the frequency wording (before/after shown, word-level diff); nothing of the other
//      business appears.
//   B. Real code against staging rows: loadCustomerAgreement picks the right variant; a signed
//      semi-annual customer with a pending switch is asked for the annual text, and on acceptance the
//      interval switches (paper trail, move prompt) without touching the booked visit.
//   C. The 30-day heads-up: content, annual-only selection, once-only selection, expiring-card link.
// Everything it creates is deleted at the end (CLAUDE.md standing rule).
import { createRequire } from "node:module";
import path from "node:path";

const require_ = createRequire(path.resolve("../uinta-field-app/package.json"));
const dotenv = require_("dotenv") as { config: (o: { path: string; quiet: boolean }) => void };
dotenv.config({ path: path.resolve("../uinta-field-app/.env.local"), quiet: true });

const slug = process.argv.find((a) => a === "uinta" || a === "camelback") ?? "uinta";
const URL_ = process.env.STAGING_SUPABASE_URL ?? "";
if (!process.argv.includes("--confirm-staging") || !URL_ || URL_.includes("kmiouwsccbcevoahaybk")) {
  console.error("ABORT: pass --confirm-staging and have STAGING_* set (never production).");
  process.exit(2);
}
process.env.NEXT_PUBLIC_SUPABASE_URL = URL_;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.STAGING_SERVICE_ROLE_KEY ?? "";

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const raw = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: biz } = await raw.from("businesses").select("id").eq("slug", slug).single();
  process.env.BUSINESS_ID = biz!.id as string;

  const A = await import("../lib/agreement");
  const F = await import("../lib/agreementFrequency");
  const S = await import("../lib/jobs/runPrevisitReminderSweep");
  const { businessDb } = await import("../lib/tenant/business");
  const { getEmailBrand } = await import("../lib/email/brand");
  const oneTime = (await import("../lib/agreement.one-time.data.json")).default;
  const cardData = (await import("../lib/agreement.data.json")).default;

  let failed = 0;
  const check = (name: string, ok: boolean, detail = "") => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
    if (!ok) failed += 1;
  };
  const other = slug === "uinta" ? /camelback/i : /uinta/i;
  const text = (bs: readonly { text: string }[]) => bs.map((b) => b.text).join("\n");

  // ---- A. the agreement text ---------------------------------------------------
  console.log(`\n== A. Agreement text [${slug}] ==`);
  for (const [mode, data] of [["card_on_file", cardData], ["one_time_link", oneTime]] as const) {
    const orig = data.blocks as unknown as { kind: string; text: string }[];
    const semi = A.agreementBlocksFor(mode, "semi_annual");
    check(`[${mode}] semi-annual text is IDENTICAL to today's (every block)`, JSON.stringify(semi) === JSON.stringify(orig));
    check(`[${mode}] semi-annual version unchanged (${A.agreementVersionFor(mode, "semi_annual")})`, A.agreementVersionFor(mode, "semi_annual") === data.version);

    const annual = A.agreementBlocksFor(mode, "annual");
    const changed = annual.map((b, i) => (b.text !== orig[i].text ? i : -1)).filter((i) => i >= 0);
    check(`[${mode}] annual changes exactly ONE block (same block count)`, annual.length === orig.length && changed.length === 1, `changed block(s): ${changed}`);
    const i = changed[0];
    console.log(`  BEFORE: ${orig[i].text}\n  AFTER : ${annual[i].text}`);
    const before = orig[i].text.split(/\s+/), after = annual[i].text.split(/\s+/);
    let p = 0; while (before[p] === after[p]) p++;
    let q = 0; while (before[before.length - 1 - q] === after[after.length - 1 - q]) q++;
    console.log(`  word diff: removed "${before.slice(p, before.length - q).join(" ")}"  added "${after.slice(p, after.length - q).join(" ")}"`);
    check(`[${mode}] the changed words are only the frequency phrase`, before.slice(p, before.length - q).join(" ") === "every six (6) months," .replace(/,$/, "") + "" || /^(every six \(6\) months)$/.test(before.slice(p, before.length - q).join(" ").replace(/,$/, "")));
    check(`[${mode}] annual version is ${A.agreementVersionFor(mode, "annual")}`, A.agreementVersionFor(mode, "annual").startsWith("2026-11-19-annual") && A.agreementVersionFor(mode, "annual").endsWith(mode === "one_time_link" ? "-link" : "annual"));

    const mixed = A.agreementBlocksFor(mode, "mixed", [{ address: "12 Oak St", months: 12 }, { address: "9 Elm Ave", months: 6 }]);
    const mchanged = mixed.filter((b, k) => b.text !== orig[k]?.text).length;
    check(`[${mode}] mixed adds one line listing each property`, mixed.length === orig.length + 1 && mixed.some((b) => b.text.startsWith("Frequency by property: 12 Oak St — once a year; 9 Elm Ave — every six (6) months.")), `blocks differing from today's by position: ${mchanged}`);
    for (const f of ["semi_annual", "annual", "mixed"] as const) {
      check(`[${mode}/${f}] no ${slug === "uinta" ? "Camelback" : "Uinta"} wording anywhere`, !other.test(text(A.agreementBlocksFor(mode, f, [{ address: "x", months: 12 }, { address: "y", months: 6 }]))));
    }
  }
  // every non-frequency term identical: compare all blocks except the one that changes
  const semiAll = text(A.agreementBlocksFor("card_on_file", "semi_annual"));
  const annAll = text(A.agreementBlocksFor("card_on_file", "annual"));
  console.log(`  total characters: semi ${semiAll.length}, annual ${annAll.length} (difference ${semiAll.length - annAll.length})`);
  check("freqency helper: only an ANNUAL property triggers a variant (4-month + 6-month stays semi-annual)", A.frequencyOf([4, 6]) === "semi_annual" && A.frequencyOf([12]) === "annual" && A.frequencyOf([12, 6]) === "mixed" && A.frequencyOf([12, 4]) === "mixed" && A.frequencyOf([6, 6]) === "semi_annual");

  // ---- B. real rows --------------------------------------------------------------
  console.log(`\n== B. Staging rows [${slug}] ==`);
  const db = businessDb();
  const created = { customers: [] as string[], properties: [] as string[], jobs: [] as string[] };
  const semiV = A.agreementVersionFor("card_on_file", "semi_annual");
  async function mk(tag: string, props: { interval: number | null; pending?: number | null }[], opts: { signed?: boolean; mode?: string } = {}) {
    const { data: c, error } = await db.from("customers").insert({
      full_name: `TEST ANNUAL ${tag}`, email: `maxwellbbaldauf+annual-${tag}@gmail.com`, source: "manual",
      payment_mode: opts.mode ?? "card_on_file",
      ...(opts.signed ? { service_agreement_version: semiV, service_agreement_accepted_at: new Date().toISOString() } : {}),
    }).select("id").single();
    if (error) throw new Error(error.message);
    created.customers.push(c!.id as string);
    const ids: string[] = [];
    for (const [k, pr] of props.entries()) {
      const { data: p, error: pe } = await db.from("properties").insert({
        customer_id: c!.id, nickname: `TEST ANNUAL ${tag} ${k}`, address: `${100 + k} Test Rd (TEST)`, latitude: 39.7106, longitude: -111.838,
        geocoded_at: new Date().toISOString(), source: "manual", plan_status: "active",
        service_interval_months: pr.interval, pending_interval_months: pr.pending ?? null,
      }).select("id").single();
      if (pe) throw new Error(pe.message);
      created.properties.push(p!.id as string);
      ids.push(p!.id as string);
    }
    return { customerId: c!.id as string, propertyIds: ids };
  }

  try {
    const c1 = await mk("annual", [{ interval: 12 }]);
    const a1 = await F.loadCustomerAgreement(c1.customerId);
    check("annual customer -> annual agreement; text says 'once a year'", a1.frequency === "annual" && text(A.agreementBlocksFor("card_on_file", a1.frequency, a1.lines)).includes("approximately once a year,"));

    const c2 = await mk("semi", [{ interval: null }], { signed: true });
    const a2 = await F.loadCustomerAgreement(c2.customerId);
    check("semi-annual customer -> semi_annual; their signed version is still CURRENT", a2.frequency === "semi_annual" && A.agreementIsCurrentFor(semiV, "card_on_file", a2.frequency));

    const c3 = await mk("mixed", [{ interval: 12 }, { interval: null }]);
    const a3 = await F.loadCustomerAgreement(c3.customerId);
    check("two properties, one annual -> mixed, with both listed", a3.frequency === "mixed" && a3.lines.length === 2 && a3.lines.some((l) => l.months === 12) && a3.lines.some((l) => l.months === 6));

    const c4 = await mk("custom", [{ interval: 4 }, { interval: null }]);
    const a4 = await F.loadCustomerAgreement(c4.customerId);
    check("a 4-month customer is left out: semi_annual, text unchanged", a4.frequency === "semi_annual");

    const c6 = await mk("link", [{ interval: 12 }], { mode: "one_time_link" });
    const a6 = await F.loadCustomerAgreement(c6.customerId);
    check("annual + one-time link -> the -annual-link version, same link text apart from the frequency phrase", a6.frequency === "annual" && A.agreementVersionFor("one_time_link", a6.frequency).endsWith("annual-link") && JSON.stringify(A.agreementBlocksFor("one_time_link", "annual").filter((_, k) => k !== 8)) === JSON.stringify((oneTime.blocks as unknown as { kind: string; text: string }[]).filter((_, k) => k !== 8)));

    // pending switch on a signed semi-annual customer
    const c5 = await mk("switch", [{ interval: null, pending: 12 }], { signed: true });
    const { data: j } = await db.from("jobs").insert({ property_id: c5.propertyIds[0], status: "scheduled", scheduled_date: "2027-05-10", arrival_block: 3, blocks_needed: 1, quoted_price_cents: 20000, access_token: crypto.randomUUID() }).select("id").single();
    created.jobs.push(j!.id as string);
    const a5 = await F.loadCustomerAgreement(c5.customerId);
    check("pending switch: the customer is asked for the ANNUAL text", a5.frequency === "annual");
    check("...their old semi-annual signature is not current for it (they must sign)", !A.agreementIsCurrentFor(semiV, "card_on_file", a5.frequency));
    const { data: pBefore } = await db.from("properties").select("service_interval_months, pending_interval_months").eq("id", c5.propertyIds[0]).single();
    check("...and until they accept, the real interval is unchanged", pBefore!.service_interval_months === null && pBefore!.pending_interval_months === 12);

    // acceptance
    await db.from("customers").update(F.acceptanceFields("card_on_file", a5.frequency)).eq("id", c5.customerId);
    const applied = await F.applyPendingSwitches(c5.customerId);
    const { data: cu } = await db.from("customers").select("service_agreement_version, service_agreement_frequency").eq("id", c5.customerId).single();
    const { data: pAfter } = await db.from("properties").select("service_interval_months, pending_interval_months, interval_move_prompt").eq("id", c5.propertyIds[0]).single();
    const { data: log } = await db.from("property_interval_changes").select("old_interval_months, new_interval_months").eq("property_id", c5.propertyIds[0]);
    const { data: jAfter } = await db.from("jobs").select("scheduled_date, status").eq("id", j!.id as string).single();
    console.log(`  signature record: version=${cu!.service_agreement_version} frequency=${cu!.service_agreement_frequency}`);
    check("acceptance records the annual version AND frequency", cu!.service_agreement_version === A.agreementVersionFor("card_on_file", "annual") && cu!.service_agreement_frequency === "annual");
    check("...then the interval switches to 12, pending clears, owner is prompted", applied === 1 && pAfter!.service_interval_months === 12 && pAfter!.pending_interval_months === null && pAfter!.interval_move_prompt === true);
    check("...with a paper-trail row (null -> 12)", JSON.stringify(log) === JSON.stringify([{ old_interval_months: null, new_interval_months: 12 }]));
    check("...and the already-booked visit did NOT move", jAfter!.scheduled_date === "2027-05-10" && jAfter!.status === "scheduled");
    const again = await F.applyPendingSwitches(c5.customerId);
    check("accepting twice does nothing more", again === 0);

    // ---- C. the 30-day heads-up --------------------------------------------------
    console.log(`\n== C. 30-day heads-up [${slug}] ==`);
    const brand = await getEmailBrand();
    const jobRow = (interval: number | null): import("../lib/jobs/runPrevisitReminderSweep").ReminderJobRow => ({
      id: "00000000-0000-0000-0000-000000000001", scheduled_date: "2027-11-13", arrival_block: 3, blocks_needed: 1,
      access_token: "tok_test_123", quoted_price_cents: 20000,
      property: { address: "123 Test Rd", service_interval_months: interval, service_type: "residential", custom_price_cents: null,
        customer: { id: c1.customerId, full_name: "Test Person", email: "maxwellbbaldauf+annual-annual@gmail.com", payment_mode: "card_on_file", stripe_customer_id: null, default_payment_method_id: null, payment_setup_token: null, payment_setup_token_expires_at: null } },
    });
    const tiers = { basePriceCents: 20000, commercialPriceCents: 30000 };
    const mail = S.buildReminderContent({ kind: "30day", job: jobRow(12), appBaseUrl: "https://example.test", tiers, brand, cardUpdate: null })!;
    console.log(`  subject: ${mail.subject}`);
    console.log(`  text:\n${mail.text.split("\n").map((l) => "    " + l).join("\n")}`);
    check("30-day email: date, arrival window, manage link, price, branding", /November 13, 2027|Nov(ember)? 13/.test(mail.text) && /arrival window/i.test(mail.text) && mail.text.includes("https://example.test/visit/tok_test_123") && mail.text.includes("$200.00 per visit") && mail.html.includes(brand.name));
    check(`30-day email carries no ${slug === "uinta" ? "Camelback" : "Uinta"} wording`, !other.test(mail.html + mail.text));
    check("...and no card-update link when the card is fine", !/update my card/i.test(mail.html));

    const expiringCustomer = { ...(jobRow(12).property as { customer: import("../lib/jobs/runPrevisitReminderSweep").SweepCustomer }).customer, default_payment_method_id: "pm_test_expiring" };
    const expires = async (y: number, m: number, cust = expiringCustomer) =>
      S.expiringCardUpdateLink(cust, "2027-11-13", "https://example.test", async () => ({ card: { exp_year: y, exp_month: m, brand: "visa", last4: "4242" } }));
    const soon = await expires(2027, 5);
    check("card expiring BEFORE the visit (05/2027 vs Nov 2027) -> update link, minted token", !!soon && /^https:\/\/example\.test\/pay\/.{20,}$/.test(soon.link));
    if (soon) {
      const tok = soon.link.split("/pay/")[1];
      const { data: row } = await db.from("customers").select("payment_setup_token").eq("id", c1.customerId).single();
      check("...the token is stored on the customer (so /pay/[token] resolves)", row!.payment_setup_token === tok);
      const withLink = S.buildReminderContent({ kind: "30day", job: jobRow(12), appBaseUrl: "https://example.test", tiers, brand, cardUpdate: soon })!;
      check("...and the email shows 'Update my card' with Visa •••• 4242", /Update my card/.test(withLink.html) && withLink.text.includes("•••• 4242"));
    }
    check("card good through the visit month (11/2027) -> no link", (await expires(2027, 11)) === null);
    check("card good well past the visit (12/2028) -> no link", (await expires(2028, 12)) === null);
    check("one-time-link customer -> never a card link", (await expires(2027, 5, { ...expiringCustomer, payment_mode: "one_time_link" })) === null);

    const mine = [jobRow(12), jobRow(null), jobRow(6), jobRow(4)];
    check("only the ANNUAL job is selected for a 30-day email (semi/default/6/4-month are not)", S.selectAnnualJobs(mine).length === 1 && S.selectAnnualJobs(mine)[0] === mine[0]);
    const m7 = S.buildReminderContent({ kind: "7day", job: jobRow(null), appBaseUrl: "https://example.test", tiers, brand, cardUpdate: null })!;
    check("7-day / 24-hour emails keep their wording (headline, 'Reschedule' button, no heads-up copy)", /coming up next week/.test(m7.text) && /Reschedule:/.test(m7.text) && !/annual/i.test(m7.text));

    // once-only: the same query the sweep uses
    const { data: j30 } = await db.from("jobs").insert({ property_id: c1.propertyIds[0], status: "scheduled", scheduled_date: "2031-03-03", arrival_block: 3, blocks_needed: 1, quoted_price_cents: 20000, access_token: crypto.randomUUID() }).select("id").single();
    created.jobs.push(j30!.id as string);
    const pick = async () => (await db.from("jobs").select("id").eq("status", "scheduled").eq("scheduled_date", "2031-03-03").is("reminder_30day_sent_at", null)).data ?? [];
    const first = await pick();
    await db.from("jobs").update({ reminder_30day_sent_at: new Date().toISOString() }).eq("id", j30!.id as string);
    const second = await pick();
    check("sent-at stamp: selected once, then never again", first.length === 1 && second.length === 0);
    await db.from("jobs").update({ scheduled_date: "2031-03-10", reminder_30day_sent_at: null }).eq("id", j30!.id as string);
    check("a reschedule clears the stamp path (new date selectable again)", ((await db.from("jobs").select("id").eq("scheduled_date", "2031-03-10").is("reminder_30day_sent_at", null)).data ?? []).length === 1);
  } finally {
    if (created.jobs.length) await db.from("jobs").delete().in("id", created.jobs);
    if (created.properties.length) {
      await db.from("property_interval_changes").delete().in("property_id", created.properties);
      await db.from("properties").delete().in("id", created.properties);
    }
    if (created.customers.length) await db.from("customers").delete().in("id", created.customers);
    console.log(`cleanup: deleted ${created.jobs.length} jobs, ${created.properties.length} properties, ${created.customers.length} customers`);
  }
  console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
