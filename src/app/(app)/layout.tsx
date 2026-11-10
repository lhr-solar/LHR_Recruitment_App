import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/auth";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
