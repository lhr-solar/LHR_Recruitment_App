import { NavLink } from "@/components/nav-link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Admin sections. Team leads get their own team's join requests, roster and members.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  const supabase = await createClient();
  // Row-level security narrows both counts to what the viewer can review.
  const [joins, partners] = await Promise.all([
    supabase.from("member_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    viewer.isAdmin
      ? supabase.from("partner_access_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <>
      <nav className="subnav" aria-label="Admin">
        <NavLink href="/admin" exact>
          Join requests
          <Waiting count={joins.count} />
        </NavLink>
        <NavLink href="/admin/roster">Roster</NavLink>
        <NavLink href="/admin/members">Members</NavLink>
        {viewer.isAdmin && (
          <>
            <NavLink href="/admin/companies">Companies</NavLink>
            <NavLink href="/admin/partners">
              Partner requests
              <Waiting count={partners.count} />
            </NavLink>
            <NavLink href="/admin/jobs">Jobs</NavLink>
            <NavLink href="/admin/lists">Lists</NavLink>
            <NavLink href="/admin/access">Resume access</NavLink>
            <NavLink href="/admin/emails">Email</NavLink>
          </>
        )}
      </nav>
      {children}
    </>
  );
}

function Waiting({ count }: { count: number | null }) {
  if (!count) return null;
  return (
    <span className="tab-count">
      {count}
      <span className="visually-hidden"> waiting</span>
    </span>
  );
}
