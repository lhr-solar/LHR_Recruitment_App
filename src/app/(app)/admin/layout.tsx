import { NavLink } from "@/components/nav-link";
import { requireStaff } from "@/lib/auth";

// Admin sections. Team leads only review join requests, so they get no tabs.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  return (
    <>
      {viewer.isAdmin && (
        <nav className="subnav" aria-label="Admin">
          <NavLink href="/admin" exact>
            Join requests
          </NavLink>
          <NavLink href="/admin/partners">Partner requests</NavLink>
          <NavLink href="/admin/access">Resume access</NavLink>
        </nav>
      )}
      {children}
    </>
  );
}
