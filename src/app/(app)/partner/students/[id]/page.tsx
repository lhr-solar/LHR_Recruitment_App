import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerProfileView } from "@/components/partner-profile-view";
import { requireActivePartner } from "@/lib/auth";
import { filterQuery, loadBookStudent, parseFilters } from "@/lib/resume-book";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const student = await loadBookStudent((await params).id);
  return { title: student?.fullName ?? "Student" };
}

export default async function BookStudentPage({ params, searchParams }: Props) {
  await requireActivePartner();
  const [{ id }, search] = await Promise.all([params, searchParams]);
  // Hidden, unfinished or unknown profiles all look the same from here.
  const student = await loadBookStudent(id);
  if (!student) notFound();

  // The list's filters ride along in the URL, so going back lands on the same search.
  const query = filterQuery(parseFilters(search));

  return (
    <div className="pv-page">
      <Link href={`/partner/students${query ? `?${query}` : ""}`} className="link back-link">
        Back to the resume book
      </Link>
      <PartnerProfileView profile={student} />
    </div>
  );
}
