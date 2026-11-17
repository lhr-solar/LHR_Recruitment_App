import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { requireActivePartner } from "@/lib/auth";
import {
  PAGE_SIZE,
  activeFilterCount,
  filterOptions,
  filterQuery,
  parseFilters,
  searchResumeBook,
  skillIndex,
  type BookCard,
} from "@/lib/resume-book";
import { GRAD_SEMESTERS, termKey } from "@/lib/student-options";
import { TEAMS } from "@/lib/teams";
import { FilterForm, SortSelect } from "./filter-form";

export const metadata: Metadata = { title: "Student directory" };

const LOOKING_FOR: Record<string, string> = {
  internship: "Internship",
  full_time: "Full-time",
  both: "Internship or full-time",
};

export default async function ResumeBookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireActivePartner();
  const filters = parseFilters(await searchParams);
  const skills = await skillIndex();
  const [options, results] = await Promise.all([filterOptions(skills), searchResumeBook(filters, skills)]);

  const activeCount = activeFilterCount(filters);
  const pages = Math.max(1, Math.ceil(results.total / PAGE_SIZE));
  const first = (filters.page - 1) * PAGE_SIZE + 1;
  const last = first + results.cards.length - 1;
  // Opening a student keeps the search, so "Back to the resume book" returns to the same list.
  const listQuery = filterQuery(filters);

  return (
    <div>
      <header className="page-head">
        <h1>Student directory</h1>
        <p>
          {options.total === 0
            ? "Longhorn Racing students who choose to share their profile show up here."
            : `${options.total} Longhorn Racing ${options.total === 1 ? "student shares" : "students share"} a profile with Partners. Download resumes and contact students directly.`}
        </p>
      </header>

      <div className="book">
        <FilterForm
          activeCount={activeCount}
          options={options}
          values={{
            q: filters.q,
            teams: filters.teams,
            subsystem: filters.subsystem,
            major: filters.major,
            from: filters.from ? termKey(filters.from) : "",
            to: filters.to ? termKey(filters.to) : "",
            interest: filters.interest,
            skills: filters.skills,
            usOnly: filters.usOnly,
            sort: filters.sort,
          }}
        />

        <section className="book-results" aria-labelledby="book-count">
          <div className="book-results-head">
            <h2 id="book-count" className="book-count" aria-live="polite">
              {results.error
                ? "Students"
                : results.total === 0
                  ? "No students"
                  : results.total <= PAGE_SIZE
                    ? `${results.total} ${results.total === 1 ? "student" : "students"}`
                    : `${first}–${last} of ${results.total} students`}
            </h2>
            {results.total > 1 && <SortSelect value={filters.sort} />}
          </div>

          {results.error ? (
            <div className="notice notice-error" role="alert">
              <p>We couldn&apos;t load the student directory. Refresh the page to try again.</p>
            </div>
          ) : results.cards.length === 0 ? (
            <div className="panel empty-block">
              {options.total === 0 ? (
                <>
                  <h3>No profiles yet</h3>
                  <p>Students appear once they&apos;ve added a resume, major and graduation date and chosen to show their profile.</p>
                </>
              ) : (
                <>
                  <h3>No students match these filters</h3>
                  <p>
                    Try fewer skills or a wider graduation range, or{" "}
                    <Link className="link" href="/partner/students">
                      clear the filters
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="book-list">
              {results.cards.map((card) => (
                <li key={card.id}>
                  <StudentCard card={card} query={listQuery} picked={filters.skills} />
                </li>
              ))}
            </ul>
          )}

          {pages > 1 && !results.error && (
            <nav className="book-pages" aria-label="Pages">
              {filters.page > 1 ? (
                <Link className="btn btn-secondary" href={`/partner/students?${filterQuery(filters, { page: filters.page - 1 })}`}>
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="num">
                Page {filters.page} of {pages}
              </span>
              {filters.page < pages ? (
                <Link className="btn btn-secondary" href={`/partner/students?${filterQuery(filters, { page: filters.page + 1 })}`}>
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}

          <p className="book-note">Resume views and downloads are logged and visible to Longhorn Racing admins.</p>
        </section>
      </div>
    </div>
  );
}

const SHOWN_SKILLS = 6;

function StudentCard({ card, query, picked }: { card: BookCard; query: string; picked: string[] }) {
  const team = TEAMS.find((t) => t.slug === card.team);
  const href = `/partner/students/${card.id}${query ? `?${query}` : ""}`;
  const semester = GRAD_SEMESTERS.find((s) => s.value === card.gradSemester)?.label;
  const facts = [card.major, semester && card.gradYear ? `Graduates ${semester} ${card.gradYear}` : null, card.careerInterest && LOOKING_FOR[card.careerInterest]].filter(Boolean);
  const roleLine = [card.position, card.subsystem].filter(Boolean).join(" · ");

  // Skills the Partner filtered on come first, so the match is visible at a glance.
  const skills = [...card.skills].sort((a, b) => Number(picked.includes(b.id)) - Number(picked.includes(a.id)));
  const shown = skills.slice(0, SHOWN_SKILLS);

  return (
    <article className="panel book-card" data-team={card.team}>
      <div className="book-card-head">
        <Avatar name={card.fullName} url={card.photoUrl} size={48} className="book-avatar" />
        <div className="book-card-identity">
          <h3>
            <Link href={href} className="book-card-link">
              {card.fullName}
            </Link>
          </h3>
          {roleLine && <p className="book-card-role">{roleLine}</p>}
        </div>
        {team && <Image className="book-card-team" src={team.logo} alt={`${team.name} team`} width={66} height={14} unoptimized />}
      </div>

      {card.technicalFocus && <p className="book-card-focus">{card.technicalFocus}</p>}
      {facts.length > 0 && <p className="book-card-facts">{facts.join(" · ")}</p>}

      {shown.length > 0 && (
        <ul className="book-card-skills" aria-label="Skills">
          {shown.map((skill) => (
            <li key={skill.id} data-match={picked.includes(skill.id) || undefined}>
              {skill.name}
            </li>
          ))}
          {skills.length > SHOWN_SKILLS && <li className="book-card-more">+{skills.length - SHOWN_SKILLS} more</li>}
        </ul>
      )}

      <div className="book-card-actions">
        <a className="link" href={`/partner/students/${card.id}/resume?download=1`}>
          Download resume
        </a>
      </div>
    </article>
  );
}
