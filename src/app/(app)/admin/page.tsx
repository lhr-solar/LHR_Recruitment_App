import type { Metadata } from "next";
import { SubmitButton } from "@/components/submit-button";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { teamName } from "@/lib/teams";
import { reviewMemberRequest } from "./actions";

export const metadata: Metadata = { title: "Admin" };

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

type MemberRequestRow = {
  id: string;
  team: string;
  note: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

export default async function AdminPage() {
  const viewer = await requireStaff();
  const supabase = await createClient();

  // Row-level security limits team leads to their own team's requests.
  const { data, error } = await supabase
    .from("member_requests")
    .select("id, team, note, created_at, profiles!member_requests_user_id_fkey(full_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  const requests = (data ?? []) as unknown as MemberRequestRow[];

  const scope = viewer.isAdmin ? "every team" : `the ${teamName(viewer.team)} team`;

  return (
    <div>
      <header className="page-head">
        <h1>Admin</h1>
        <p>Confirm students asking to join {scope}. Approved students can build the profile Partners see.</p>
      </header>

      <section className="panel table-panel" aria-labelledby="requests-title">
        <div className="table-head">
          <h2 id="requests-title">Join requests</h2>
          <span className="num text-[var(--color-muted)]">{error ? "" : `${requests.length} waiting`}</span>
        </div>

        {error ? (
          <p className="table-message">We couldn&apos;t load join requests. Refresh the page to try again.</p>
        ) : requests.length === 0 ? (
          <p className="table-message">No one is waiting. New requests from @utexas.edu accounts show up here.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Team</th>
                <th scope="col">Note</th>
                <th scope="col" className="num">
                  Asked
                </th>
                <th scope="col">
                  <span className="visually-hidden">Decision</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <span className="cell-primary">{request.profiles?.full_name ?? "Name not set"}</span>
                    <span className="cell-secondary">{request.profiles?.email}</span>
                  </td>
                  <td>{teamName(request.team)}</td>
                  <td className="cell-note">{request.note ?? <span className="text-[var(--color-muted)]">No note</span>}</td>
                  <td className="num">{dateFormat.format(new Date(request.created_at))}</td>
                  <td>
                    <form action={reviewMemberRequest} className="row-actions">
                      <input type="hidden" name="requestId" value={request.id} />
                      <SubmitButton name="decision" value="approve" pendingLabel="Approving">
                        Approve
                      </SubmitButton>
                      <SubmitButton name="decision" value="decline" variant="danger" pendingLabel="Declining">
                        Decline
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
