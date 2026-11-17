// Labels shared by the admin member screens.

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Waiting to join",
  rejected: "Declined",
  suspended: "Paused",
};

export type StudentSummary = { major: string | null; grad_year: number | null; visible: boolean; resume_path: string | null } | null;

// What Partners see of a member: listed in the resume book, hidden by the student, or unfinished.
export function profileState(student: StudentSummary) {
  if (!student) return "No profile yet";
  if (!student.resume_path || !student.major || !student.grad_year) return "Unfinished";
  return student.visible ? "In the resume book" : "Hidden from Partners";
}
