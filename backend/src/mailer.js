// Outgoing email. Resend's HTTP API when RESEND_API_KEY is set; otherwise every
// message is printed to the log, which is enough to click a reset link in dev and
// keeps the app bootable with no mail provider at all.
//
// `mailEnabled` is reported to the frontend so an unconfigured deployment doesn't
// offer "Forgot password?" and then silently never send anything.

const API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.MAIL_FROM ?? "StreakArena <hello@streakarena.app>";

export const mailEnabled = API_KEY !== "";

/** The public base URL links in emails point at. Required for links to work in production. */
export const APP_URL = (process.env.APP_URL ?? process.env.APP_ORIGIN ?? "http://localhost:5173").replace(/\/+$/, "");

export async function sendMail({ to, subject, text, html }) {
  if (!mailEnabled) {
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return { ok: true, dev: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, text, html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Mail provider answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return { ok: true };
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** One plain layout for every email: a line, a button, the raw link as a fallback. */
export function layout({ heading, body, cta, url, footer }) {
  const text = `${heading}\n\n${body}\n\n${cta}: ${url}\n\n${footer ?? ""}`.trim();
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:20px;font-weight:700;padding-bottom:12px">🔥 ${escapeHtml(heading)}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;color:#334155;padding-bottom:20px">${escapeHtml(body)}</td></tr>
<tr><td style="padding-bottom:20px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escapeHtml(cta)}</a></td></tr>
<tr><td style="font-size:12px;color:#64748b;word-break:break-all">Or paste this link: ${escapeHtml(url)}</td></tr>
${footer ? `<tr><td style="font-size:12px;color:#64748b;padding-top:16px">${escapeHtml(footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
  return { text, html };
}
