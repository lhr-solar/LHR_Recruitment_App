import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { requireStaff } from "@/lib/auth";
import { STATUS_LABEL } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";
import { StatusForm } from "../../members/member-forms";
import { deleteCompany, revokeInvite } from "../actions";
import { CompanyForm, InviteForm } from "../company-forms";

export const metadata: Metadata = { title: "Company" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

type Recruiter = { user_id: string; title: string | null; created_at: string; profiles: { full_name: string | null; email: string; status: string } | null };

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: company }, tiers, members, invites, jobs] = await Promise.all([
    supabase.from("partner_companies").select("id, name, website, description, tier_id, active").eq("id", id).maybeSingle(),
    supabase.from("partner_tiers").select("id, name").order("rank"),
    supabase.from("partner_members").select("user_id, title, created_at, profiles(full_name, email, status)").eq("company_id", id).order("created_at"),
    supabase.from("partner_invites").select("id, email, created_at").eq("company_id", id).is("accepted_at", null).order("created_at"),
    supabase.from("jobs").select("status").eq("company_id", id),
  ]);
  if (!company) notFound();

  const recruiters = (members.data ?? []) as unknown as Recruiter[];
  const pending = invites.data ?? [];
  const posts = jobs.data ?? [];
  const open = posts.filter((j) => j.status === "open").length;
  const deletable = recruiters.length === 0 && posts.length === 0;

  return (
    <div className="admin-stack">
      <Link href="/admin/companies" className="link back-link">
        Back to companies
      </Link>

      <header className="page-head">
        <h1>{company.name}</h1>
        <p>
          {recruiters.length} {recruiters.length === 1 ? "recruiter" : "recruiters"} · {open} open {open === 1 ? "post" : "posts"} of {posts.length}
          {posts.length > 0 && (
            <>
              {" · "}
              <Link className="link" href={`/admin/jobs?company=${company.id}`}>
                See posts
              </Link>
            </>
          )}
        </p>
      </header>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel table-panel" aria-labelledby="recruiters-title">
            <div className="table-head">
              <h2 id="recruiters-title">Recruiters</h2>
            </div>
            {recruiters.length === 0 ? (
              <p className="table-message">No one has signed in for {company.name} yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Recruiter</th>
                    <th scope="col">Account</th>
                    <th scope="col" className="num">
                      Joined
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Access</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recruiters.map((r) => (
                    <tr key={r.user_id}>
                      <td>
                        <span className="cell-primary">{r.profiles?.full_name ?? r.profiles?.email}</span>
                        <span className="cell-secondary">{[r.title, r.profiles?.full_name ? r.profiles.email : null].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td>
                        {r.profiles?.status === "active" ? (
                          STATUS_LABEL.active
                        ) : (
                          <span className="status-chip" data-status={r.profiles?.status}>
                            {STATUS_LABEL[r.profiles?.status ?? ""] ?? r.profiles?.status}
                          </span>
                        )}
                      </td>
                      <td className="num" data-label="Joined">{dateFormat.format(new Date(r.created_at))}</td>
                      <td>
                        {(r.profiles?.status === "active" || r.profiles?.status === "suspended") && (
                          <div className="row-actions">
                            <StatusForm userId={r.user_id} paused={r.profiles.status === "suspended"} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="invite-panel">
              <h3>Invite a recruiter</h3>
              <p className="field-hint">They get an email, and their first sign-in with that address lands them in the resume book.</p>
              <InviteForm companyId={company.id} />
              {pending.length > 0 && (
                <ul className="invite-list" aria-label="Waiting for sign-in">
                  {pending.map((invite) => (
                    <li key={invite.id}>
                      <span>
                        <span className="cell-primary">{invite.email}</span>
                        <span className="cell-secondary">Invited {dateFormat.format(new Date(invite.created_at))}, hasn&apos;t signed in yet</span>
                      </span>
                      <form action={revokeInvite}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <input type="hidden" name="companyId" value={company.id} />
                        <SubmitButton variant="secondary" pendingLabel="Cancelling">
                          Cancel invite
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
        <div className="detail-side">
          <section className="panel profile-section" aria-labelledby="company-details-title">
            <h2 id="company-details-title">Details</h2>
            <CompanyForm
              company={{ id: company.id, name: company.name, website: company.website, description: company.description, tierId: company.tier_id, active: company.active }}
              tiers={tiers.data ?? []}
            />
          </section>

          {deletable && (
            <section className="panel profile-section" aria-labelledby="company-delete-title">
              <h2 id="company-delete-title">Delete company</h2>
              <p className="field-hint">No recruiters or posts yet, so it can be removed entirely. Pending invites are cancelled.</p>
              <form action={deleteCompany}>
                <input type="hidden" name="id" value={company.id} />
                <SubmitButton variant="danger" pendingLabel="Deleting">
                  Delete {company.name}
                </SubmitButton>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
