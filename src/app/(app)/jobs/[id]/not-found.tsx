import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="narrow">
      <header className="page-head">
        <h1>This post is closed</h1>
        <p>The company may have filled the role or taken the post down.</p>
      </header>
      <Link href="/jobs" className="btn btn-secondary">
        See open jobs
      </Link>
    </div>
  );
}
