import { assertDev } from "@/lib/dev";
import { Harness } from "./Harness";

export const dynamic = "force-dynamic";

// DEV ONLY isolation harness for the step-1 PaymentSetup component + the two
// payment API routes. Delete /dev before launch.
export default function DevPaymentSetupPage() {
  assertDev();
  return <Harness />;
}
