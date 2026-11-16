"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// `exact` is for a parent page, such as a section's first tab, that shouldn't light up for its children.
export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = pathname === href || (!exact && pathname.startsWith(`${href}/`));
  return (
    <Link href={href} className="nav-link" aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
