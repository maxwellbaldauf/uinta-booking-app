// Real before/after job photos (Addendum B), distinct from the stock photos
// on the homepage pricing cards. Source: photo-intake/manifest.md, which is
// gitignored and never committed — captions/alt text below restate only
// what that manifest recorded (brand, machine type, city, what's shown),
// never anything inferred from the images themselves.
//
// Each pair is used at most twice sitewide (Addendum B). uline-grid-chute
// appears on / and /about; ge-reservoir appears on / and /ice-machine-cleaning.
export type JobPhotoPair = {
  id: string;
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  caption: string;
};

export const JOB_PHOTOS: JobPhotoPair[] = [
  {
    id: "uline-grid-chute-lehi",
    before: {
      src: "/images/jobs/uline-undercounter-grid-chute-before-lehi.webp",
      alt: "U-Line undercounter ice machine ice grid and chute with mineral and rust staining before cleaning, Lehi, Utah.",
    },
    after: {
      src: "/images/jobs/uline-undercounter-grid-chute-after-lehi.webp",
      alt: "U-Line undercounter ice machine ice grid and chute, cleaned, Lehi, Utah.",
    },
    caption: "U-Line undercounter ice machine, ice grid and chute, Lehi, Utah.",
  },
  {
    id: "ge-reservoir-park-city",
    before: {
      src: "/images/jobs/ge-undercounter-reservoir-before-park-city.webp",
      alt: "GE undercounter ice machine reservoir corner with scale and black buildup before cleaning, Park City, Utah.",
    },
    after: {
      src: "/images/jobs/ge-undercounter-reservoir-after-park-city.webp",
      alt: "GE undercounter ice machine reservoir corner, cleaned, Park City, Utah.",
    },
    caption: "GE undercounter ice machine, reservoir corner, Park City, Utah.",
  },
];
