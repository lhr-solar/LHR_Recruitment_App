import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resume access" };

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

const KIND: Record<string, string> = {
  resume_view: "Viewed resume",
  resume_download: "Downloaded resume",
  portfolio_view: "Viewed 3D model",
  portfolio_download: "Downloaded portfolio file",
};

type LogRow = {
  id: number;
  kind: string;
  created_at: string;
  partner: { full_name: string | null; email: string } | null;
  company: { name: string } | null;
  student: { team: string; profiles: { full_name: string | null; email: string } | null } | null;
  file: { file_name: string } | null;
};

export default async function AccessLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireStaff();
  // The log is admin-only (row-level security agrees); team leads go back to join requests.
  if (!viewer.isAdmin) redirect("/admin");

  const params = await searchParams;
  const company = typeof params.company === "string" && UUID.test(params.company) ? params.company : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("resume_access_log")
    .select(
      "id, kind, created_at, partner:profiles!resume_access_log_partner_user_id_fkey(full_name, email), company:partner_companies(name), student:students(team, profiles(full_name, email)), file:student_files(file_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (company) query = query.eq("company_id", company);
  const start = (page - 1) * PAGE_SIZE;

  const [{ data, count, error }, companies] = await Promise.all([
    query.range(start, start + PAGE_SIZE - 1),
    supabase.from("partner_companies").select("id, name").order("name"),
  ]);
  const rows = (data ?? []) as unknown as LogRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => `/admin/access?${new URLSearchParams({ ...(company && { company }), ...(n > 1 && { page: String(n) }) })}`;

  return (
    <div>
      <header className="page-head">
        <h1>Resume access</h1>
        <p>Every time a Partner recruiter opens or downloads a student&apos;s resume or portfolio file. Repeat views within ten minutes count once.</p>
      </header>

      <section className="panel table-panel" aria-labelledby="log-title">
        <div className="table-head">
          <h2 id="log-title">Activity</h2>
          <Form action="/admin/access" className="table-filter">
            <label className="visually-hidden" htmlFor="log-company">
              Company
            </label>
            <select id="log-company" name="company" className="input" defaultValue={company}>
              <option value="">All Partners</option>
              {(companies.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">
              Show
            </button>
          </Form>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load the access log. Refresh the page to try again.</p>
        ) : rows.length === 0 ? (
          <p className="table-message">
            {company ? "No one from this Partner has opened a resume yet." : "No Partner has opened a resume yet. Views and downloads show up here as they happen."}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Partner</th>
                <th scope="col">Student</th>
                <th scope="col">What</th>
                <th scope="col" className="num">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="cell-primary">{row.partner?.full_name ?? row.partner?.email ?? "Deleted account"}</span>
                    <span className="cell-secondary">{[row.company?.name, row.partner?.full_name ? row.partner.email : null].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td>
                    <span className="cell-primary">{row.student?.profiles?.full_name ?? row.student?.profiles?.email}</span>
                    {row.student?.profiles?.full_name && <span className="cell-secondary">{row.student.profiles.email}</span>}
                  </td>
                  <td>
                    {KIND[row.kind] ?? row.kind}
                    {row.file && <span className="cell-secondary">{row.file.file_name}</span>}
                  </td>
                  <td className="num">{when.format(new Date(row.created_at))}</td>
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
