// The emails LHR Careers sends, as HTML and plain text. Pure functions with no server imports, so
// scripts/send-email-previews.ts can render them too.
//
// Email HTML is its own world: table layout, inline styles, no web fonts guaranteed. Montserrat
// and Urbanist load where the mail app allows it (Apple Mail, iOS) and fall back to Helvetica/Arial.

export type RenderedEmail = { subject: string; html: string; text: string };

// Inline attachment id for the logo; email.ts attaches the PNG under this id.
export const LOGO_CID = "lhr-careers-logo";

const COLOR = {
  paper: "#EDEFF3",
  card: "#FFFFFF",
  well: "#F5F6F8",
  ink: "#0E2A38",
  ink2: "#2E4653",
  muted: "#4D6270",
  rule: "#D5DCE2",
  accent: "#045F85",
};
const DISPLAY = "Montserrat, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const BODY = "Urbanist, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type Block =
  | { p: string }
  | { list: string[] }
  | { details: [label: string, value: string][] }
  | { button: { label: string; href: string } }
  | { link: { label: string; href: string } }
  | { note: string };

type Layout = {
  subject: string;
  // The grey line inbox lists show after the subject.
  preheader: string;
  heading: string;
  blocks: Block[];
  // Why this person got the email, in the footer.
  reason: string;
};

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function blockHtml(block: Block): string {
  if ("p" in block) {
    return `<p style="margin:0 0 16px;font-family:${BODY};font-size:16px;line-height:26px;color:${COLOR.ink2};">${esc(block.p)}</p>`;
  }
  if ("list" in block) {
    const items = block.list
      .map(
        (item) =>
          `<tr><td valign="top" style="width:20px;padding:0 0 8px;font-family:${BODY};font-size:16px;line-height:26px;color:${COLOR.accent};">&#8226;</td><td style="padding:0 0 8px;font-family:${BODY};font-size:16px;line-height:26px;color:${COLOR.ink2};">${esc(item)}</td></tr>`,
      )
      .join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">${items}</table>`;
  }
  if ("details" in block) {
    const rows = block.details
      .map(
        ([label, value], i) =>
          `<tr><td style="padding:${i ? "10px" : "0"} 0 0;font-family:${BODY};font-size:13px;line-height:18px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${COLOR.muted};">${esc(label)}</td></tr><tr><td style="padding:2px 0 0;font-family:${BODY};font-size:16px;line-height:24px;color:${COLOR.ink};">${esc(value)}</td></tr>`,
      )
      .join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr><td style="padding:16px 20px;background:${COLOR.well};border-radius:6px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr></table>`;
  }
  if ("button" in block) {
    const { label, href } = block.button;
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:6px;background:${COLOR.accent};"><a href="${esc(href)}" style="display:inline-block;padding:13px 24px;font-family:${DISPLAY};font-size:15px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">${esc(label)}</a></td></tr></table>`;
  }
  if ("link" in block) {
    const { label, href } = block.link;
    return `<p style="margin:-8px 0 24px;font-family:${BODY};font-size:15px;line-height:24px;"><a href="${esc(href)}" style="color:${COLOR.accent};font-weight:600;text-decoration:underline;">${esc(label)}</a></p>`;
  }
  return `<p style="margin:0 0 16px;font-family:${BODY};font-size:14px;line-height:22px;color:${COLOR.muted};">${esc(block.note)}</p>`;
}

function blockText(block: Block): string {
  if ("p" in block) return block.p;
  if ("note" in block) return block.note;
  if ("list" in block) return block.list.map((item) => `- ${item}`).join("\n");
  if ("details" in block) return block.details.map(([label, value]) => `${label}: ${value}`).join("\n");
  if ("button" in block) return `${block.button.label}: ${block.button.href}`;
  return `${block.link.label}: ${block.link.href}`;
}

function render({ subject, preheader, heading, blocks, reason }: Layout): RenderedEmail {
  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600&family=Urbanist:wght@400;600&display=swap" rel="stylesheet">
<style>
  @media (max-width: 620px) {
    .card-pad { padding: 28px 24px !important; }
    .head-pad { padding: 24px 24px 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLOR.paper};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.paper};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
  <tr><td style="background:${COLOR.card};border-radius:8px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td class="head-pad" style="padding:32px 40px 0;">
      <img src="cid:${LOGO_CID}" width="200" height="66" alt="Longhorn Racing Careers" style="display:block;width:200px;height:66px;border:0;outline:none;">
    </td></tr>
    <tr><td class="card-pad" style="padding:32px 40px 24px;">
      <h1 style="margin:0 0 20px;font-family:${DISPLAY};font-size:24px;line-height:32px;font-weight:600;color:${COLOR.ink};">${esc(heading)}</h1>
      ${blocks.map(blockHtml).join("\n      ")}
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 40px 0;font-family:${BODY};font-size:13px;line-height:20px;color:${COLOR.muted};text-align:center;">
    <p style="margin:0 0 8px;font-family:${DISPLAY};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${COLOR.ink2};">LHR Careers · Longhorn Racing</p>
    <p style="margin:0;">${esc(reason)}</p>
  </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [heading, "", ...blocks.flatMap((block) => [blockText(block), ""]), "--", "LHR Careers · Longhorn Racing", reason].join("\n");
  return { subject, html, text };
}

// ── Students ────────────────────────────────────────────────────────────────

export function joinApprovedEmail({ team, profileUrl }: { team: string; profileUrl: string }) {
  return render({
    subject: `You're in: LHR Careers (${team})`,
    preheader: "Build your profile so Longhorn Racing's Partners can find you.",
    heading: "Welcome to LHR Careers",
    blocks: [
      { p: `Your request to join the ${team} team on LHR Careers was approved.` },
      {
        p: "Next, build your profile. Once it has your resume, major and graduation date, it appears in the student directory that Longhorn Racing's Partners use to find interns and new hires.",
      },
      { button: { label: "Build your profile", href: profileUrl } },
      { note: "You decide whether Partners see your profile, and you can change that at any time." },
    ],
    reason: "You're receiving this because you asked to join LHR Careers.",
  });
}

export function joinDeclinedEmail({ team }: { team: string }) {
  return render({
    subject: "Your LHR Careers request",
    preheader: `An update on your request to join ${team}.`,
    heading: "About your request",
    blocks: [
      { p: `Your request to join the ${team} team on LHR Careers wasn't approved.` },
      { p: "If you're on the team and think this is a mistake, ask your team lead to add your email to the roster, then sign in again." },
    ],
    reason: "You're receiving this because you asked to join LHR Careers.",
  });
}

// ── Partners ────────────────────────────────────────────────────────────────

export function partnerWelcomeEmail({ company, email, invited, signInUrl }: { company: string; email: string; invited: boolean; signInUrl: string }) {
  return render({
    subject: invited ? `Your invitation to LHR Careers for ${company}` : `Your LHR Careers access for ${company}`,
    preheader: `Meet the engineers who design, build and race Longhorn Racing's cars.`,
    heading: invited ? `You're invited to LHR Careers` : `Your access is ready`,
    blocks: [
      {
        p: invited
          ? `Longhorn Racing has invited you to LHR Careers as a recruiter for ${company}.`
          : `Your request was approved: you now have recruiter access to LHR Careers for ${company}.`,
      },
      { p: "LHR Careers is where our Partners meet the students who design, build and race Longhorn Racing's Solar, Electric and Combustion cars. With your access you can:" },
      {
        list: [
          "Browse the student directory and filter by team, subsystem, major, graduation date and skills",
          "Post internships, co-ops and full-time roles to the job board",
          "See how many students viewed each post, and who applied",
        ],
      },
      { button: { label: "Sign in to LHR Careers", href: signInUrl } },
      { note: `Sign in with ${email}, using Google or a one-time link we email you. No password needed.` },
    ],
    reason: invited
      ? `You're receiving this because a Longhorn Racing admin invited ${email}.`
      : `You're receiving this because you requested Partner access to LHR Careers.`,
  });
}

export function newApplicantEmail({
  student,
  team,
  jobTitle,
  details,
  profileUrl,
  applicantsUrl,
}: {
  student: string;
  team: string | null;
  jobTitle: string;
  details: [string, string][];
  profileUrl: string;
  applicantsUrl: string;
}) {
  return render({
    subject: `${student} applied to ${jobTitle}`,
    preheader: `A Longhorn Racing ${team ? `${team} ` : ""}member applied through LHR Careers.`,
    heading: `New applicant for ${jobTitle}`,
    blocks: [
      { p: `${student}${team ? `, a member of Longhorn Racing ${team},` : ""} marked that they applied to your ${jobTitle} post through LHR Careers.` },
      { details: [["Name", student], ...details] },
      { button: { label: "View profile and resume", href: profileUrl } },
      { link: { label: "See everyone who applied", href: applicantsUrl } },
    ],
    reason: `You're receiving this because ${jobTitle} is posted on LHR Careers for your company.`,
  });
}
