import Link from "next/link";

export default function StudentNotFound() {
  return (
    <div className="narrow">
      <header className="page-head">
        <h1>Profile not available</h1>
        <p>This student may have hidden their profile, or the link is out of date.</p>
      </header>
      <Link href="/partner/students" className="btn btn-secondary">
        Back to the resume book
      </Link>
    </div>
  );
}
