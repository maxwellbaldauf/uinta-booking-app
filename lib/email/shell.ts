// HTML-table email layout (spec §8): Outlook and several mobile clients don't
// render flexbox or CSS grid, so everything is <table> + inline styles. Colors
// match Project A's recap email.

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BRAND = "#0f6e8c";
const INK = "#14171a";
const MUTED = "#5b6470";
const BORDER = "#e1e4e8";

// Wraps inner content HTML in the branded shell. `preheader` is the hidden
// snippet shown in inbox list views.
export function renderEmail(opts: { title: string; preheader?: string; inner: string }): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f7f8fa;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BORDER};border-radius:8px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="background:${BRAND};padding:18px 24px;">
            <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.3px;">Uinta Ice Co</span>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;color:${INK};font-size:15px;line-height:1.55;">
            ${opts.inner}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid ${BORDER};color:${MUTED};font-size:12px;line-height:1.5;">
            Uinta Ice Co · residential and light commercial ice machine cleaning
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// A key/value details box (date, address, price...).
export function detailsTable(rows: { label: string; value: string }[]): string {
  const trs = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 0;color:${MUTED};font-size:13px;white-space:nowrap;vertical-align:top;width:120px;">${escapeHtml(r.label)}</td>
        <td style="padding:6px 0;color:${INK};font-size:14px;vertical-align:top;">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;border:1px solid ${BORDER};border-radius:6px;">
    <tr><td style="padding:12px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${trs}</table>
    </td></tr>
  </table>`;
}

// A full-width button (table-based so Outlook renders it).
export function buttonRow(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr><td style="border-radius:8px;background:${BRAND};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}
