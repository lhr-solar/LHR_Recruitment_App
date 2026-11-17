import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { STATUS_LABEL, profileState, type StudentSummary } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";
import { teamName } from "@/lib/teams";
import { RoleForm, StatusForm } from "../member-forms";

export const metadata: Metadata = { title: "Member" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

type Member = {
  id: string;
  full_name: string | null;
  email: string;
  team: string | null;
  status: string;
  is_admin: boolean;
  is_team_lead: boolean;
  created_at: string;
  students: (NonNullable<StudentSummary> & { position: string | null; subsystems: { name: string } | null }) | null;
};

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireStaff();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  // Row-level security limits team leads to their own team.
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, team, status, is_admin, is_team_lead, created_at, students(major, grad_year, visible, resume_path, position, subsystems(name))")
    .eq("id", id)
    .eq("account_type", "member")
    .maybeSingle();
  if (!data) notFound();
  const member = data as unknown as Member;

  const self = member.id === viewer.id;
  // Mirrors set_account_status: admins pause anyone else; team leads pause students on their team.
  const canPause = !self && (viewer.isAdmin || (member.team === viewer.team && !member.is_admin && !member.is_team_lead));
  const roles = [member.is_admin && "Admin", member.is_team_lead && `${teamName(member.team)} team lead`].filter(Boolean).join(" · ");
  const student = member.students;
  const role = [student?.position, student?.subsystems?.name].filter(Boolean).join(", ");

  return (
    <div className="admin-stack">
      <Link href="/admin/members" className="link back-link">
        Back to members
      </Link>

      <header className="page-head">
        <h1>{member.full_name ?? member.email}</h1>
        <p>
          {member.email}
          {roles && ` · ${roles}`}
        </p>
      </header>

      <section className="panel member-facts" aria-labelledby="member-facts-title">
        <h2 id="member-facts-title" className="visually-hidden">
          Details
        </h2>
        <dl className="pv-facts facts-grid">
          <div>
            <dt>Account</dt>
            <dd>
              <span className="status-chip" data-status={member.status}>
                {STATUS_LABEL[member.status] ?? member.status}
              </span>
            </dd>
          </div>
          <div>
            <dt>Team</dt>
            <dd>{teamName(member.team) ?? "None yet"}</dd>
          </div>
          <div>
            <dt>On the car</dt>
            <dd>{role || "Not set"}</dd>
          </div>
          <div>
            <dt>Major</dt>
            <dd>{[student?.major, student?.grad_year && `class of ${student.grad_year}`].filter(Boolean).join(", ") || "Not set"}</dd>
          </div>
          <div>
            <dt>Profile</dt>
            <dd>{profileState(student)}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{dateFormat.format(new Date(member.created_at))}</dd>
          </div>
        </dl>
      </section>

      <div className="detail-pair">
        {viewer.isAdmin && (
          <section className="panel profile-section" aria-labelledby="member-role-title">
            <h2 id="member-role-title">Team and roles</h2>
            <RoleForm member={{ id: member.id, team: member.team, isAdmin: member.is_admin, isTeamLead: member.is_team_lead }} self={self} />
          </section>
        )}

        {canPause && (member.status === "active" || member.status === "suspended") && (
          <section className="panel profile-section" aria-labelledby="member-access-title">
            <h2 id="member-access-title">{member.status === "suspended" ? "Access is paused" : "Access"}</h2>
            <p className="field-hint">
              {member.status === "suspended"
                ? "They can't sign in to their profile, and Partners can't see them. Restoring brings everything back as it was."
                : "Pausing locks them out of LHR Careers and takes them out of the student directory. Their profile is kept, so you can restore it later."}
            </p>
            <StatusForm userId={member.id} paused={member.status === "suspended"} />
          </section>
        )}
      </div>
    </div>
  );
}
