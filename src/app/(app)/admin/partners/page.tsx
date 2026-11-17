import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = { title: "Partner requests" };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

type RequestRow = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  title: string | null;
  company_name: string;
  company_website: string | null;
  message: string | null;
  created_at: string;
};

export default async function PartnerRequestsPage() {
  const viewer = await requireStaff();
  // Partner access is admin-only (row-level security agrees); team leads go back to join requests.
  if (!viewer.isAdmin) redirect("/admin");

  const supabase = await createClient();
  const [{ data, error }, companies] = await Promise.all([
    supabase
      .from("partner_access_requests")
      .select("id, user_id, email, full_name, title, company_name, company_website, message, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("partner_companies").select("id, name").order("name"),
  ]);
  const requests = (data ?? []) as RequestRow[];
  const companyList = (companies.data ?? []) as { id: string; name: string }[];

  return (
    <div>
      <header className="page-head">
        <h1>Partner requests</h1>
        <p>Recruiters asking for access to the student directory. Approving links them to a company and lets them in right away.</p>
      </header>

      <section className="panel table-panel" aria-labelledby="partner-requests-title">
        <div className="table-head">
          <h2 id="partner-requests-title">Waiting for review</h2>
          <span className="num text-[var(--color-muted)]">{error ? "" : `${requests.length} waiting`}</span>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load Partner requests. Refresh the page to try again.</p>
        ) : requests.length === 0 ? (
          <p className="table-message">No one is waiting. Requests from the Partner sign-in door and the public request form show up here.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Recruiter</th>
                <th scope="col">Company</th>
                <th scope="col">Note</th>
                <th scope="col" className="num">
                  Asked
                </th>
                <th scope="col">Decision</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const match = companyList.find((c) => c.name.toLowerCase() === request.company_name.trim().toLowerCase());
                return (
                  <tr key={request.id}>
                    <td>
                      <span className="cell-primary">{request.full_name}</span>
                      <span className="cell-secondary">{[request.title, request.email].filter(Boolean).join(" · ")}</span>
                      {!request.user_id && <span className="cell-secondary">Hasn&apos;t signed in yet</span>}
                    </td>
                    <td>
                      <span className="cell-primary">{request.company_name}</span>
                      {request.company_website && (
                        <a className="link cell-secondary" href={request.company_website} target="_blank" rel="noopener noreferrer">
                          {request.company_website.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </a>
                      )}
                    </td>
                    <td className="cell-note">{request.message ?? <span className="text-[var(--color-muted)]">No note</span>}</td>
                    <td className="num">{dateFormat.format(new Date(request.created_at))}</td>
                    <td>
                      <ReviewForm requestId={request.id} companyName={request.company_name} companies={companyList} match={match?.id ?? null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
