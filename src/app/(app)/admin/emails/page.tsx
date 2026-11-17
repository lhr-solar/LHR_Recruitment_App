import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Email" };

const PAGE_SIZE = 50;
const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

const KINDS: Record<string, string> = {
  join_approved: "Join approved",
  join_declined: "Join declined",
  partner_invited: "Partner invite",
  partner_approved: "Partner access approved",
  new_applicant: "New applicant",
};

const STATUS: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  delayed: "Delayed",
  bounced: "Bounced",
  complained: "Marked as spam",
  failed: "Not sent",
};

const SHOW = {
  opened: "Opened",
  unopened: "Not opened yet",
  problem: "Didn't arrive",
} as const;

const PROBLEMS = ["bounced", "complained", "failed"];

type LogRow = {
  id: number;
  kind: string;
  recipient: string;
  subject: string;
  status: string;
  detail: string | null;
  sent_at: string;
  opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  click_count: number;
  person: { full_name: string | null; account_type: string } | null;
};

export default async function EmailLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireStaff();
  // The log is admin-only (row-level security agrees).
  if (!viewer.isAdmin) redirect("/admin");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.replace(/[,()\\%_]/g, " ").trim().slice(0, 100) : "";
  const kind = typeof params.kind === "string" && params.kind in KINDS ? params.kind : "";
  const show = typeof params.show === "string" && params.show in SHOW ? (params.show as keyof typeof SHOW) : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("email_log")
    .select("id, kind, recipient, subject, status, detail, sent_at, opened_at, last_opened_at, open_count, click_count, person:profiles(full_name, account_type)", {
      count: "exact",
    })
    .order("sent_at", { ascending: false })
    .order("id", { ascending: false });
  if (q) query = query.or(`recipient.ilike.%${q}%,subject.ilike.%${q}%`);
  if (kind) query = query.eq("kind", kind);
  if (show === "opened") query = query.not("opened_at", "is", null);
  if (show === "unopened") query = query.is("opened_at", null).not("status", "in", `(${PROBLEMS.join(",")})`);
  if (show === "problem") query = query.in("status", PROBLEMS);
  const start = (page - 1) * PAGE_SIZE;

  // The summary covers the last 30 days, whatever the filters.
  const since = daysAgo(30);
  const recent = () => supabase.from("email_log").select("id", { count: "exact", head: true }).gte("sent_at", since);
  const [{ data, count, error }, sent, delivered, opened, problems] = await Promise.all([
    query.range(start, start + PAGE_SIZE - 1),
    recent(),
    recent().not("delivered_at", "is", null),
    recent().not("opened_at", "is", null),
    recent().in("status", PROBLEMS),
  ]);
  const rows = (data ?? []) as unknown as LogRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(q || kind || show);
  const pageHref = (n: number) => `/admin/emails?${new URLSearchParams({ ...(q && { q }), ...(kind && { kind }), ...(show && { show }), ...(n > 1 && { page: String(n) }) })}`;
  const sentCount = sent.count ?? 0;
  const share = (n: number | null) => (sentCount ? `${Math.round(((n ?? 0) / sentCount) * 100)}%` : "–");

  return (
    <div>
      <header className="page-head">
        <h1>Email</h1>
        <p>
          Every email LHR Careers sends, and what happened to it. Delivery, opens and link clicks update as Resend reports them. Opens are approximate: some mail apps load
          images on their own, which counts as an open, and others block them, so a click is the surest sign someone read it.
        </p>
      </header>

      <section className="panel stat-row" aria-label="Last 30 days">
        <Stat label="Delivered" value={share(delivered.count)} hint={`${delivered.count ?? 0} of ${sentCount} sent in the last 30 days`} />
        <Stat label="Opened" value={share(opened.count)} hint={`${opened.count ?? 0} of ${sentCount} sent`} />
        <Stat label="Didn't arrive" value={String(problems.count ?? 0)} hint="Bounced, blocked or marked as spam" />
      </section>

      <section className="panel table-panel" aria-labelledby="emails-title">
        <div className="table-head table-head-wrap">
          <h2 id="emails-title">
            {filtered ? "Matching emails" : "All emails"} <span className="table-head-count num">{error ? "" : total}</span>
          </h2>
          <Form action="/admin/emails" className="table-filter">
            <label className="visually-hidden" htmlFor="emails-q">
              Search recipients and subjects
            </label>
            <input id="emails-q" name="q" type="search" className="input" defaultValue={q} placeholder="Search" />
            <label className="visually-hidden" htmlFor="emails-kind">
              Email
            </label>
            <select id="emails-kind" name="kind" className="input" defaultValue={kind}>
              <option value="">Every email</option>
              {Object.entries(KINDS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="visually-hidden" htmlFor="emails-show">
              Show
            </label>
            <select id="emails-show" name="show" className="input" defaultValue={show}>
              <option value="">Any outcome</option>
              {Object.entries(SHOW).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">
              Show
            </button>
          </Form>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load the email log. Refresh the page to try again.</p>
        ) : rows.length === 0 ? (
          <p className="table-message">{filtered ? "No emails match those filters." : "No emails yet. Each one shows up here as it's sent."}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Recipient</th>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Opened</th>
                <th scope="col" className="num">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="cell-primary">{row.person?.full_name ?? row.recipient}</span>
                    <span className="cell-secondary">
                      {[row.person?.full_name ? row.recipient : null, row.person?.account_type === "partner" ? "Partner" : null].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td>
                    <span className="cell-primary">{KINDS[row.kind] ?? row.kind}</span>
                    <span className="cell-secondary">{row.subject}</span>
                  </td>
                  <td>
                    <span className="status-chip" data-status={`email-${row.status}`}>
                      {STATUS[row.status] ?? row.status}
                    </span>
                    {row.detail && <span className="cell-secondary">{row.detail}</span>}
                  </td>
                  <td>
                    {row.opened_at ? (
                      <>
                        <span className="cell-primary num">{when.format(new Date(row.opened_at))}</span>
                        <span className="cell-secondary">
                          {[
                            row.open_count > 1 && `${row.open_count} opens, last ${when.format(new Date(row.last_opened_at ?? row.opened_at))}`,
                            row.click_count > 0 && (row.click_count === 1 ? "Clicked a link" : `Clicked links ${row.click_count} times`),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </>
                    ) : (
                      <span className="cell-secondary">Not yet</span>
                    )}
                  </td>
                  <td className="num">{when.format(new Date(row.sent_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <nav className="table-pages" aria-label="Pages">
            {page > 1 ? <Link className="btn btn-secondary" href={pageHref(page - 1)}>Newer</Link> : <span />}
            <span className="num">
              Page {page} of {pages}
            </span>
            {page < pages ? <Link className="btn btn-secondary" href={pageHref(page + 1)}>Older</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="stat">
      <p className="stat-value num">{value}</p>
      <p className="stat-label">{label}</p>
      <p className="field-hint">{hint}</p>
    </div>
  );
}
