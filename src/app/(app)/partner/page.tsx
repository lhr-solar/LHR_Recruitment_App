import { redirect } from "next/navigation";

// Partners land on the resume book.
export default function PartnerHomePage() {
  redirect("/partner/students");
}
