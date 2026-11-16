"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef } from "react";
import { termKey, termLabel, type Term } from "@/lib/student-options";
import { TEAMS } from "@/lib/teams";

type Props = {
  values: {
    q: string;
    teams: string[];
    subsystem: string;
    major: string;
    from: string;
    to: string;
    interest: string;
    skills: string[];
    usOnly: boolean;
    sort: string;
  };
  options: {
    subsystems: string[];
    majors: string[];
    terms: Term[];
    skills: { id: string; name: string; category: string }[];
  };
  activeCount: number;
};

export const FILTER_FORM_ID = "book-filters";

// The resume book's filters. A GET form, so every search is a shareable URL and works without
// JavaScript; with it, each change applies right away.
export function FilterForm({ values, options, activeCount }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const apply = () => form.current?.requestSubmit();

  const categories = [...new Set(options.skills.map((skill) => skill.category))];
  // A filter value no student has any more (say, a bookmarked major) still shows, so it can be cleared.
  const subsystems = withCurrent(options.subsystems, values.subsystem);
  const majors = withCurrent(options.majors, values.major);

  return (
    <Form
      ref={form}
      id={FILTER_FORM_ID}
      action="/partner/students"
      className="panel book-filters"
      aria-label="Filters"
      onChange={(event) => {
        // The search box applies on Enter, not on every keystroke.
        if ((event.target as HTMLElement).getAttribute("name") !== "q") apply();
      }}
    >
      <div className="field">
        <label className="field-label" htmlFor="book-q">
          Search
        </label>
        <input
          id="book-q"
          name="q"
          type="search"
          className="input"
          defaultValue={values.q}
          placeholder="Name, role or what they built"
          maxLength={80}
          enterKeyHint="search"
        />
        {/* Enter submits the form; this keeps that true without JavaScript too. */}
        <button type="submit" className="visually-hidden" tabIndex={-1}>
          Search
        </button>
      </div>

      <label className="check book-us-only">
        <input type="checkbox" name="us" value="1" defaultChecked={values.usOnly} />
        U.S. Citizens &amp; Green Card holders only
      </label>

      <fieldset className="field">
        <legend className="field-label">Team</legend>
        <div className="choice-list">
          {TEAMS.map((team) => (
            <label key={team.slug} className="check">
              <input type="checkbox" name="team" value={team.slug} defaultChecked={values.teams.includes(team.slug)} />
              <span className="book-team-dot" data-team={team.slug} aria-hidden="true" />
              {team.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="field-label" htmlFor="book-subsystem">
          Subsystem
        </label>
        <select id="book-subsystem" name="subsystem" className="input" defaultValue={values.subsystem}>
          <option value="">Any subsystem</option>
          {subsystems.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="book-major">
          Major
        </label>
        <select id="book-major" name="major" className="input" defaultValue={values.major}>
          <option value="">Any major</option>
          {majors.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="field">
        <legend className="field-label">Graduating</legend>
        <div className="book-terms">
          <select name="from" className="input" aria-label="Graduating in or after" defaultValue={values.from}>
            <option value="">From any term</option>
            {options.terms.map((term) => (
              <option key={termKey(term)} value={termKey(term)}>
                From {termLabel(term)}
              </option>
            ))}
          </select>
          <select name="to" className="input" aria-label="Graduating in or before" defaultValue={values.to}>
            <option value="">To any term</option>
            {options.terms.map((term) => (
              <option key={termKey(term)} value={termKey(term)}>
                To {termLabel(term)}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">Looking for</legend>
        <div className="segmented">
          {[
            { value: "", label: "Any" },
            { value: "internship", label: "Internship" },
            { value: "full_time", label: "Full-time" },
          ].map((option) => (
            <label key={option.value} className="segment">
              <input type="radio" name="interest" value={option.value} defaultChecked={values.interest === option.value} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {options.skills.length > 0 && (
        <details className="book-skills" open={values.skills.length > 0}>
          <summary className="field-label">
            Skills
            {values.skills.length > 0 && <span className="book-skills-count">{values.skills.length} selected</span>}
          </summary>
          <div className="book-skills-body">
            <p className="field-hint">Students with every skill you pick.</p>
            {categories.map((category) => (
              <fieldset key={category} className="skill-group">
                <legend className="skill-group-name">{category}</legend>
                <div className="skill-chips">
                  {options.skills
                    .filter((skill) => skill.category === category)
                    .map((skill) => (
                      <label key={skill.id} className="skill-chip">
                        <input type="checkbox" name="skill" value={skill.id} defaultChecked={values.skills.includes(skill.id)} />
                        <span>{skill.name}</span>
                      </label>
                    ))}
                </div>
              </fieldset>
            ))}
          </div>
        </details>
      )}

      {activeCount > 0 && (
        <Link href={values.sort !== "recent" ? `/partner/students?sort=${values.sort}` : "/partner/students"} className="btn btn-quiet book-clear">
          Clear {activeCount === 1 ? "filter" : `all ${activeCount} filters`}
        </Link>
      )}
    </Form>
  );
}

function withCurrent(list: string[], current: string) {
  return current && !list.some((item) => item.toLowerCase() === current.toLowerCase()) ? [current, ...list] : list;
}

// Sits above the results but belongs to the filter form, so a sort keeps the filters and vice versa.
export function SortSelect({ value }: { value: string }) {
  return (
    <label className="book-sort">
      <span>Sort by</span>
      <select
        name="sort"
        form={FILTER_FORM_ID}
        className="input"
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="recent">Recently updated</option>
        <option value="graduation">Graduating soonest</option>
      </select>
    </label>
  );
}
