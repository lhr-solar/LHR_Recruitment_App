import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { STATUS_LABEL, todayInAustin, type JobStatus } from "@/lib/job-options";
import { statsFor } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Job posts" };

const PAGE_SIZE = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES: JobStatus[] = ["open", "draft", "closed"];
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

type JobRow = {
  id: string;
  title: string;
  status: JobStatus;
  deadline: string | null;
  published_at: string | null;
  created_at: string;
  partner_companies: { id: string; name: string } | null;
};

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");

  const params = await searchParams;
  const company = typeof params.company === "string" && UUID.test(params.company) ? params.company : "";
  const status = STATUSES.find((s) => s === params.status) ?? "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("id, title, status, deadline, published_at, created_at, partner_companies(id, name)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (company) query = query.eq("company_id", company);
  if (status) query = query.eq("status", status);
  const start = (page - 1) * PAGE_SIZE;
  const [{ data, count, error }, companies] = await Promise.all([
    query.range(start, start + PAGE_SIZE - 1),
    supabase.from("partner_companies").select("id, name").order("name"),
  ]);
  const rows = (data ?? []) as unknown as JobRow[];
  const stats = await statsFor(rows.map((r) => r.id));
  const today = todayInAustin();

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filters = { ...(company && { company }), ...(status && { status }) };
  const pageHref = (n: number) => `/admin/jobs?${new URLSearchParams({ ...filters, ...(n > 1 && { page: String(n) }) })}`;

  return (
    <div>
      <header className="page-head">
        <h1>Job posts</h1>
        <p>Every post from every Partner. Open one to read it, close it if it shouldn&apos;t be on the job board, or delete it.</p>
      </header>

      <section className="panel table-panel" aria-labelledby="jobs-title">
        <div className="table-head table-head-wrap">
          <h2 id="jobs-title">
            Posts <span className="table-head-count num">{error ? "" : total}</span>
          </h2>
          <Form action="/admin/jobs" className="table-filter">
            <label className="visually-hidden" htmlFor="jobs-company">
              Company
            </label>
            <select id="jobs-company" name="company" className="input" defaultValue={company}>
              <option value="">All Partners</option>
              {(companies.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="visually-hidden" htmlFor="jobs-status">
              Status
            </label>
            <select id="jobs-status" name="status" className="input" defaultValue={status}>
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">
              Show
            </button>
          </Form>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load job posts. Refresh the page to try again.</p>
        ) : rows.length === 0 ? (
          <p className="table-message">{company || status ? "No posts match." : "No Partner has posted a job yet."}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Post</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Viewed
                </th>
                <th scope="col" className="num">
                  Clicked apply
                </th>
                <th scope="col" className="num">
                  Applied
                </th>
                <th scope="col" className="num">
                  Posted
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const s = stats.get(row.id);
                const expired = row.status === "open" && row.deadline !== null && row.deadline < today;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link href={`/admin/jobs/${row.id}`} className="link-plain cell-primary">
                        {row.title}
                      </Link>
                      <span className="cell-secondary">{row.partner_companies?.name}</span>
                    </td>
                    <td>
                      <span className="status-chip" data-status={expired ? "closed" : row.status}>
                        {expired ? "Deadline passed" : STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="num" data-label="Viewed">{s?.views ?? 0}</td>
                    <td className="num" data-label="Clicked apply">{s?.clicks ?? 0}</td>
                    <td className="num" data-label="Applied">{s?.applicants ?? 0}</td>
                    <td className="num" data-label="Posted">{dateFormat.format(new Date(row.published_at ?? row.created_at))}</td>
                  </tr>
                );
              })}
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
