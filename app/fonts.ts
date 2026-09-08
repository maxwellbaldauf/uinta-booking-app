import { Inter, Tenor_Sans } from "next/font/google";

// Body / UI face for the marketing pages. Weights in use: 400 running text,
// 500 emphasis + buttons + nav, 600 strong.
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body",
});

// Display face — headings, eyebrows, the wordmark. Free stand-in for the
// brand's licensed face (La Marisa); swapping a bought webfont in later is a
// one-line change here plus the @font-face. Tenor Sans ships a single weight.
export const tenorSans = Tenor_Sans({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-display",
});
