// Verified external sources cited across the marketing pages (item 3.4).
// One place to update a URL if a source moves, referenced from each page's
// <Sources> block by key rather than duplicating href/label pairs.
export type SourceLink = { href: string; label: string };

export const SOURCE_LINKS = {
  usgs: {
    href: "https://www.usgs.gov/water-science-school/science/hardness-water",
    label: "U.S. Geological Survey — water hardness classification",
  },
  mountainRegional: {
    href: "https://www.mtnregionalwaterutah.gov/files/882bc66a4/MRW-Water-Hardness.pdf",
    label: "Mountain Regional Water — published water hardness",
  },
  herriman: {
    href: "https://www.herriman.gov/waterquality.php",
    label: "Herriman City — water quality and hardness",
  },
  southJordan: {
    href: "https://www.sjc.utah.gov/325/Water",
    label: "South Jordan — water hardness",
  },
  slcDpu: {
    href: "https://www.slc.gov/utilities/water-quality/",
    label: "Salt Lake City Department of Public Utilities — water sources",
  },
  scotsman: {
    href: "https://www.scotsman-ice.com/service/Application%20Bulletins/pab2019-01.pdf",
    label: "Scotsman — ice machine cleaning bulletin (Clear 1, nickel-safe)",
  },
  geParts: {
    href: "https://www.geapplianceparts.com/store/parts/spec/WX08X42870",
    label: "GE Appliance Parts — nickel-safe ice machine cleaner",
  },
  uline: {
    href: "https://www.u-line.com/80-55667-00.html",
    label: "U-Line — Clear Ice Machine Cleaner",
  },
} as const satisfies Record<string, SourceLink>;
