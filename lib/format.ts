const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Format a plain "YYYY-MM-DD" for display WITHOUT routing through a timezone —
// scheduled_date has no time component, so parsing it as a UTC instant and
// reformatting in local time can roll it back a day.
export function formatVisitDate(iso: string, opts?: { withYear?: boolean }): string {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const base = `${weekday}, ${MONTHS[m - 1]} ${d}`;
  return opts?.withYear ? `${base}, ${y}` : base;
}
