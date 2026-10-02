// First-party customer testimonials for /reviews. Each customer gave permission
// by reply on `permissionDate`. The text is used EXACTLY as written: no edits,
// paraphrasing, or additions. No ratings, prices, or owner replies are kept.
// Add a new entry only with the customer's permission, and keep the order.
export type Testimonial = {
  quote: string;
  displayName: string;
  permissionDate: string; // ISO date
};

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      "Max was so easy and simple to work with. He really takes care of the customer. I didn't know how much I needed my ice cube machine to be cleaned but I'm so glad that Max was able to clean it for such a good price.",
    displayName: "Jarin T.",
    permissionDate: "2026-10-01",
  },
  {
    quote:
      "Max did a great job getting our ice machine cleaned. It needed extra attention and he went the extra mile. Great value and we will definitely use him again.",
    displayName: "Nick M.",
    permissionDate: "2026-10-01",
  },
  {
    quote:
      "Max did a great job! He was efficient and got the job done quickly. In addition, he is a very nice guy.",
    displayName: "Jim S.",
    permissionDate: "2026-10-01",
  },
];
