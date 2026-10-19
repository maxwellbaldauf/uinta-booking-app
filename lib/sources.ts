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
  slcDpu2025: {
    href: "https://www.slc.gov/utilities/wp-content/uploads/sites/22/2026/06/2026-04_Water-Quality-Report-2026-digital-FNL.pdf",
    label: "Salt Lake City Department of Public Utilities — 2025 Water Quality Report (PDF)",
  },
  ogden2025: {
    href: "https://www.ogdencity.gov/DocumentCenter/View/39673/2025-Latest-Version",
    label: "Ogden City — 2025 Water Quality Report (PDF)",
  },
  weberBasin2024: {
    href: "https://www.weberbasin.gov/Docs/CCR2024.pdf",
    label: "Weber Basin Water Conservancy District — 2024 Consumer Confidence Report (PDF)",
  },
  jvwcd2025: {
    href: "https://jvwcd.gov/file/1532dbfe-7819-4096-bef6-a496c1192ab3/JVW---Consumer-Confidence-Report-2025.pdf",
    label: "Jordan Valley Water Conservancy District — 2025 Consumer Confidence Report (PDF)",
  },
  mapleton2025: {
    href: "https://cms9files.revize.com/mapletonut/Public%20Works/Water/2025%20Annual%20Drinking%20Water%20Quality%20Report.pdf",
    label: "Mapleton City — 2025 Annual Drinking Water Quality Report (PDF)",
  },
  springville2025: {
    href: "https://www.springvilleutah.gov/public-works/wp-content/uploads/sites/14/2026/05/WaterQualityReport_2025-8pg_Digital.pdf",
    label: "Springville City — 2025 Water Quality Report (PDF)",
  },
  tapWaterDataUt: {
    href: "https://www.tapwaterdata.com/water-hardness/ut",
    label: "TapWaterData — Utah hardness (USGS county-level estimates)",
  },
  aquatellUt: {
    href: "https://www.aquatell.com/pages/water-hardness-utah",
    label: "Aquatell — Utah water hardness estimates",
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
