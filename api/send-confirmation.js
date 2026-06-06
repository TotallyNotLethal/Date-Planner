const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLength = 160) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function readRequestBody(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getDetails(body) {
  return {
    confirmationId: clean(body.confirmationId, 120),
    senderName: clean(body.senderName),
    senderEmail: clean(body.senderEmail, 180).toLowerCase(),
    senderPhone: clean(body.senderPhone, 80),
    recipientName: clean(body.recipientName),
    guestName: clean(body.guestName),
    inviterName: clean(body.inviterName),
    date: clean(body.date),
    fullDate: clean(body.fullDate),
    time: clean(body.time),
    timeDescription: clean(body.timeDescription),
    food: clean(body.food),
    foodEmoji: clean(body.foodEmoji, 20),
    activity: clean(body.activity),
    activityEmoji: clean(body.activityEmoji, 20),
    excitement: Math.max(0, Math.min(100, Number(body.excitement) || 0)),
    excitementLabel: clean(body.excitementLabel),
    compatibility: Math.max(0, Math.min(100, Number(body.compatibility) || 0)),
    pageUrl: clean(body.pageUrl, 500),
  };
}

function row(label, value) {
  return `
    <tr>
      <td style="padding: 8px 0; color: #b41654; font-weight: 800; width: 120px;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0; color: #541a35; font-weight: 700;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function createEmailHtml(details) {
  const recipient = details.guestName || details.recipientName;
  const inviter = details.inviterName || details.senderName;
  const pageLink = details.pageUrl
    ? `<p style="margin: 24px 0 0;"><a href="${escapeHtml(
        details.pageUrl
      )}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #f13d83; color: #fff; font-weight: 800; text-decoration: none;">Open the planner</a></p>`
    : "";

  return `<!doctype html>
  <html>
    <body style="margin: 0; background: #ffe8f1; font-family: Arial, sans-serif; color: #541a35;">
      <div style="max-width: 620px; margin: 0 auto; padding: 34px 18px;">
        <div style="border: 12px solid #fff; border-bottom-width: 28px; border-radius: 22px; background: linear-gradient(150deg, #fff5fa, #ffbad3 58%, #ff74a4); box-shadow: 0 24px 60px rgba(120, 12, 55, 0.22); padding: 30px;">
          <p style="margin: 0 0 8px; color: #b41654; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;">Date night confirmed</p>
          <h1 style="margin: 0 0 18px; color: #7a123d; font-size: 32px; line-height: 1.1;">${escapeHtml(
            recipient
          )} finished the planner.</h1>
          <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.55;">${escapeHtml(
            inviter
          )}, your date is officially reserved.</p>

          <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.58); border-radius: 16px; padding: 12px;">
            <tbody>
              ${row("Date", details.fullDate || details.date)}
              ${row("Time", `${details.time} - ${details.timeDescription}`)}
              ${row("Food", `${details.foodEmoji} ${details.food}`.trim())}
              ${row("Activity", `${details.activityEmoji} ${details.activity}`.trim())}
              ${row("Excitement", `${details.excitement}% - ${details.excitementLabel}`)}
              ${row("Compatibility", `${details.compatibility}%`)}
              ${details.senderPhone ? row("Your phone", details.senderPhone) : ""}
            </tbody>
          </table>

          ${pageLink}
        </div>
      </div>
    </body>
  </html>`;
}

function createEmailText(details) {
  const recipient = details.guestName || details.recipientName;
  const inviter = details.inviterName || details.senderName;

  return [
    `Date night confirmed for ${inviter}.`,
    `${recipient} finished the planner.`,
    "",
    `Date: ${details.fullDate || details.date}`,
    `Time: ${details.time} - ${details.timeDescription}`,
    `Food: ${details.foodEmoji} ${details.food}`.trim(),
    `Activity: ${details.activityEmoji} ${details.activity}`.trim(),
    `Excitement: ${details.excitement}% - ${details.excitementLabel}`,
    `Compatibility: ${details.compatibility}%`,
    details.senderPhone ? `Phone on invite: ${details.senderPhone}` : "",
    details.pageUrl ? `Planner: ${details.pageUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (!process.env.RESEND_API_KEY) {
    return sendJson(res, 503, { error: "RESEND_API_KEY is not configured." });
  }

  let body;
  try {
    body = await readRequestBody(req);
  } catch {
    return sendJson(res, 400, { error: "Invalid JSON body." });
  }

  const details = getDetails(body);
  if (!details.senderName || !details.senderEmail || !details.recipientName) {
    return sendJson(res, 400, { error: "Missing sender or recipient details." });
  }

  if (!EMAIL_PATTERN.test(details.senderEmail)) {
    return sendJson(res, 400, { error: "Invalid sender email." });
  }

  const from = process.env.DATE_PLANNER_FROM_EMAIL || "Date Planner <onboarding@resend.dev>";
  const subject = `Date confirmed with ${details.recipientName}`;
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": details.confirmationId || `${details.senderEmail}-${details.recipientName}`,
    },
    body: JSON.stringify({
      from,
      to: details.senderEmail,
      subject,
      html: createEmailHtml(details),
      text: createEmailText(details),
    }),
  });

  const data = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    return sendJson(res, 502, { error: data.message || "Email failed to send." });
  }

  return sendJson(res, 200, { ok: true, id: data.id });
}
