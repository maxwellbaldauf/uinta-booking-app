// Minimal RFC 5545 .ics generation for the booking confirmation invite.
// No external library — a VEVENT is a handful of lines.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Date -> "20260829T130000Z" (UTC).
function icsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545: lines longer than 75 octets are folded with CRLF + a leading space.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(" " + rest);
  return parts.join("\r\n");
}

export type BookingIcsInput = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  organizerEmail?: string | null;
  organizerName?: string | null;
  // Bump on each reschedule so calendars update the existing event.
  sequence?: number;
  cancelled?: boolean;
};

export function buildBookingIcs(input: BookingIcsInput): string {
  const method = input.cancelled ? "CANCEL" : "PUBLISH";
  const status = input.cancelled ? "CANCELLED" : "CONFIRMED";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Uinta Ice Co//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `DTSTART:${icsUtc(input.start)}`,
    `DTEND:${icsUtc(input.end)}`,
    `SUMMARY:${escapeText(input.summary)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    `LOCATION:${escapeText(input.location)}`,
    `SEQUENCE:${input.sequence ?? 0}`,
    `STATUS:${status}`,
    ...(input.organizerEmail
      ? [
          `ORGANIZER${input.organizerName ? `;CN=${escapeText(input.organizerName)}` : ""}:mailto:${input.organizerEmail}`,
        ]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(fold).join("\r\n") + "\r\n";
}
