import { redirect } from "next/navigation";
import { getViewer, homeFor } from "@/lib/auth";

// The public landing page arrives in phase 6; until then the root sends people where they belong.
export default async function Home() {
  const viewer = await getViewer();
  redirect(viewer ? homeFor(viewer) : "/login");
}
