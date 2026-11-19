// Staging verification of "reuse a customer's existing property instead of creating a duplicate".
// STAGING ONLY - reads STAGING_* from ../uinta-field-app/.env.local, refuses production.
//   cd uinta-booking-app && ../uinta-field-app/node_modules/.bin/tsx scripts/verify-reuse-property.ts --confirm-staging [uinta|camelback]
// Runs the real lib/propertyReuse.ts against staging rows, exactly as the booking / contact paths
// call it. Everything it creates is deleted at the end (CLAUDE.md standing rule).
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
const TAG = "ZZ_REUSE_TEST_";

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const raw = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: biz } = await raw.from("businesses").select("id").eq("slug", slug).single();
  const bid = biz!.id as string;
  process.env.BUSINESS_ID = bid;
  const mod = (await import("../lib/propertyReuse")) as Record<string, unknown>;
  const findCustomerProperty = mod.findCustomerProperty as (c: string, a: string, p?: { lat: number; lng: number } | null) => Promise<{ id: string } | null>;
  const reuseCustomerProperty = mod.reuseCustomerProperty as
    | ((i: { customerId: string; address: string; coords: { lat: number; lng: number }; fields: Record<string, unknown> }) => Promise<{ id: string } | null>)
    | undefined;
  let fails = 0;
  const check = (n: string, ok: boolean, x = "") => {
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${n}${x ? " - " + x : ""}`);
  };
  const custIds: string[] = [];
  const PIN = { lat: 40.7674291, lng: -111.5426557 };
  const count = async (cid: string) => (await raw.from("properties").select("id", { count: "exact", head: true }).eq("customer_id", cid)).count ?? 0;
  const mkCust = async (n: string) => {
    const { data, error } = await raw.from("customers").insert({ business_id: bid, full_name: `${TAG}${n}`, email: `zz-${n}@zz.invalid`, source: "booking" }).select("id").single();
    if (error) throw new Error(error.message);
    custIds.push(data!.id as string);
    return data!.id as string;
  };
  const insertProp = async (cid: string, address: string, extra: Record<string, unknown> = {}) =>
    (await raw.from("properties").insert({ business_id: bid, customer_id: cid, address, latitude: PIN.lat, longitude: PIN.lng, source: "booking", plan_status: "active", ...extra }).select("id").single()).data!.id as string;
  // What a booking does: reuse the customer's property when there is one, else insert.
  const book = async (cid: string, address: string, coords = PIN) => {
    const reused = reuseCustomerProperty
      ? await reuseCustomerProperty({ customerId: cid, address, coords, fields: { address, plan_status: "active", ice_maker_brand: null, custom_price_cents: null } })
      : (await findCustomerProperty(cid, address, coords));
    if (reused) return { id: reused.id, reused: true };
    return { id: await insertProp(cid, address, { latitude: coords.lat, longitude: coords.lng }), reused: false };
  };
  try {
    console.log(`\n== ${slug} (business ${bid}) ==`);
    const A = await mkCust("A");
    const base = "1664 Preserve Dr, Park City, UT 84098";

    console.log("\n-- 1. same customer books the same address twice");
    const b1 = await book(A, base);
    const b2 = await book(A, base);
    check("second booking reused the property", b2.reused && b2.id === b1.id);
    check("customer ends up with ONE property", (await count(A)) === 1, `count=${await count(A)}`);

    console.log("\n-- 2. formatting variants of the same address match");
    for (const v of ["1664 preserve drive, park city, utah 84098", "1664  PRESERVE DR.,  Park City,  UT  84098-1234", "1664 Preserve Dr, Park City, UT 84098, USA"]) {
      const m = await findCustomerProperty(A, v, PIN);
      check(`"${v}" matches`, m?.id === b1.id);
    }
    check("still ONE property after variant lookups", (await count(A)) === 1);

    console.log("\n-- 3. a different unit does NOT match");
    const APT = { lat: 40.2338, lng: -111.6585 };
    const u2 = await insertProp(A, "500 Main St Apt 2, Provo, UT 84601", { latitude: APT.lat, longitude: APT.lng });
    check("same unit, different format matches", (await findCustomerProperty(A, "500 Main Street #2, Provo, UT 84601", APT))?.id === u2);
    check("Apt 3 does not match Apt 2 (even at the same pin)", (await findCustomerProperty(A, "500 Main St Apt 3, Provo, UT 84601", APT)) === null);
    check("no-unit address does not match the Apt 2 property", (await findCustomerProperty(A, "500 Main St, Provo, UT 84601", APT)) === null);
    const b3 = await book(A, "500 Main St Apt 3, Provo, UT 84601", APT);
    check("booking Apt 3 creates its own property", !b3.reused && b3.id !== u2, `count=${await count(A)}`);

    console.log("\n-- 4. a different customer at the same address gets their own property");
    const B = await mkCust("B");
    check("other customer does not match A's property", (await findCustomerProperty(B, base, PIN)) === null);
    const bB = await book(B, base);
    check("other customer got a NEW property", !bB.reused && bB.id !== b1.id);
    check("each customer has their own (A=3, B=1)", (await count(A)) === 3 && (await count(B)) === 1, `A=${await count(A)} B=${await count(B)}`);

    if (reuseCustomerProperty) {
      console.log("\n-- 5. rebooking onto a CANCELLED property reactivates it (no duplicate)");
      await raw.from("properties").update({ plan_status: "cancelled", plan_cancelled_at: new Date().toISOString(), custom_price_cents: 17500, notes: "keep me" }).eq("id", b1.id);
      const before = await count(A);
      const r = await book(A, "1664 PRESERVE DRIVE, Park City, UT 84098");
      const { data: p } = await raw.from("properties").select("plan_status, plan_cancelled_at, custom_price_cents, notes, address").eq("id", b1.id).single();
      check("reused the cancelled property", r.reused && r.id === b1.id);
      check("reactivated", p?.plan_status === "active" && p?.plan_cancelled_at === null);
      check("existing price override, notes and stored address untouched", p?.custom_price_cents === 17500 && p?.notes === "keep me" && p?.address === base);
      check("no new property created", (await count(A)) === before);
    }

    console.log("\n-- 6. nothing crosses the business boundary");
    const otherSlug = slug === "uinta" ? "camelback" : "uinta";
    const { data: ob } = await raw.from("businesses").select("id").eq("slug", otherSlug).single();
    const { data: oc } = await raw.from("customers").insert({ business_id: ob!.id, full_name: `${TAG}other-biz`, email: "zz-o@zz.invalid", source: "booking" }).select("id").single();
    custIds.push(oc!.id as string);
    await raw.from("properties").insert({ business_id: ob!.id, customer_id: oc!.id, address: base, source: "booking", plan_status: "active" });
    check(`${slug} lookup never sees a ${otherSlug} customer's property`, (await findCustomerProperty(oc!.id as string, base, null)) === null);
  } finally {
    if (custIds.length) {
      await raw.from("properties").delete().in("customer_id", custIds);
      await raw.from("customers").delete().in("id", custIds);
    }
    const left = (await raw.from("customers").select("id", { count: "exact", head: true }).like("full_name", `${TAG}%`)).count;
    const leftP = custIds.length ? (await raw.from("properties").select("id", { count: "exact", head: true }).in("customer_id", custIds)).count : 0;
    console.log(`\ncleanup: leftover test customers=${left} properties=${leftP}`);
    if (left || leftP) fails++;
  }
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  process.exit(fails ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
