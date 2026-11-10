import Link from "next/link";
import type { Viewer } from "@/lib/auth";
import { Logo } from "@/components/lockup";
import { NavLink } from "@/components/nav-link";

type NavItem = { href: string; label: string };

function navFor(viewer: Viewer): NavItem[] {
  if (viewer.status !== "active") return [];
  if (viewer.accountType === "partner") {
    return [{ href: "/partner", label: "Home" }];
  }
  const items: NavItem[] = [
    { href: "/profile", label: "My profile" },
    { href: "/jobs", label: "Jobs" },
  ];
  if (viewer.isAdmin || viewer.isTeamLead) items.push({ href: "/admin", label: "Admin" });
  return items;
}

export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const nav = navFor(viewer);
  const name = viewer.fullName ?? viewer.email;

  return (
    <div className="shell">
      <header className="shell-bar">
        <div className="shell-bar-inner">
          <Link href="/" className="shell-brand">
            <Logo height={22} />
            <span className="shell-product">Recruitment</span>
          </Link>

          {nav.length > 0 && (
            <nav className="shell-nav" aria-label="Main">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="shell-account">
            <span className="shell-name" title={viewer.email}>
              {name}
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn btn-quiet">
                Sign out
              </button>
            </form>
          </div>

          <details className="shell-menu">
            <summary className="btn btn-secondary">Menu</summary>
            <div className="shell-menu-sheet">
              {nav.map((item) => (
                <NavLink key={item.href} href={item.href}>
                  {item.label}
                </NavLink>
              ))}
              <p className="shell-menu-name">{name}</p>
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn btn-secondary btn-block">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      <main className="shell-main">{children}</main>
    </div>
  );
}
