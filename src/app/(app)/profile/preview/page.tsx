import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PartnerProfileView } from "@/components/partner-profile-view";
import { requireActiveMember } from "@/lib/auth";
import { joinList } from "@/lib/student-options";
import { loadStudentProfile, previewForPartners, readiness } from "@/lib/student";

export const metadata: Metadata = { title: "Preview my profile" };

export default async function ProfilePreviewPage() {
  const viewer = await requireActiveMember();
  if (!viewer.team) redirect("/profile");

  const profile = await loadStudentProfile(viewer.id, viewer.team);
  const view = await previewForPartners(viewer, viewer.team, profile);
  const { missingForPartners } = readiness(profile.student, profile.skillIds.length, profile.files.length);
  const hidden = profile.student ? !profile.student.visible : false;

  const status = hidden
    ? "Your profile is hidden, so Partners can't find it. This is what they'd see if you showed it."
    : missingForPartners.length
      ? `Partners can't see your profile until you add your ${joinList(missingForPartners)}. This is what they'll see.`
      : "This is exactly what recruiters at partner companies see.";

  return (
    <div className="pv-page">
      <div className={`preview-bar ${hidden || missingForPartners.length ? "preview-bar-pending" : ""}`} role="status">
        <p>
          <strong>Preview.</strong> {status}
        </p>
        <Link href="/profile" className="btn btn-secondary">
          Back to editing
        </Link>
      </div>
      <PartnerProfileView profile={view} preview />
    </div>
  );
}
