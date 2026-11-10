"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { Skill, StudentRow, Subsystem } from "@/lib/student";
import { CAREER_INTEREST, CITIZENSHIP, GRAD_SEMESTERS, MAX_SKILLS, MAX_WORDS, countWords, gradYears } from "@/lib/student-options";
import { saveProfile, type ProfileState } from "./actions";

type Props = {
  fullName: string;
  email: string;
  student: StudentRow | null;
  subsystems: Subsystem[];
  skills: Skill[];
  skillIds: string[];
};

export function ProfileForm({ fullName, email, student, subsystems, skills, skillIds }: Props) {
  const [state, setState] = useState<ProfileState>({ status: "idle" });
  const [saving, startSaving] = useTransition();
  // Every edit bumps a counter; the form is clean once a successful save covers the latest edit,
  // so a failed save (or typing while it runs) keeps the work protected.
  const [edits, setEdits] = useState(0);
  const [savedEdits, setSavedEdits] = useState(0);
  const dirty = edits > savedEdits;
  useUnsavedChanges(dirty);
  const [picked, setPicked] = useState(() => new Set(skillIds));
  const [projectWords, setProjectWords] = useState(() => countWords(student?.project_experience ?? ""));

  const errors = state.status === "error" ? state.fieldErrors : {};
  const s = student;

  // Submitting by hand keeps what the student typed if the save fails (a form action would reset it).
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editsAtSubmit = edits;
    startSaving(async () => {
      const result = await saveProfile(state, formData);
      setState(result);
      if (result.status === "saved") setSavedEdits(editsAtSubmit);
    });
  }

  const categories = [...new Set(skills.map((skill) => skill.category))];
  const atLimit = picked.size >= MAX_SKILLS;

  return (
    <form onSubmit={onSubmit} onChange={() => setEdits((n) => n + 1)} className="profile-form" noValidate>
      <section className="panel profile-section" aria-labelledby="about-title">
        <h2 id="about-title">About you</h2>
        <div className="form-row">
          <Field name="full_name" label="Name" error={errors.full_name}>
            <input id="full_name" name="full_name" className="input" autoComplete="name" required maxLength={120} defaultValue={fullName} {...invalid(errors.full_name, "full_name")} />
          </Field>
          <Field name="email" label="Email" hint="Partners use this to reach you. It comes from your UT account.">
            <input id="email" className="input" value={email} readOnly aria-describedby="email-hint" />
          </Field>
        </div>
        <div className="form-row">
          <Field name="subsystem_id" label="Subsystem" error={errors.subsystem_id}>
            <select id="subsystem_id" name="subsystem_id" className="input" defaultValue={s?.subsystem_id ?? ""}>
              <option value="">Choose your subsystem</option>
              {subsystems.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </Field>
          <Field name="position" label="Role on the team" hint="For example: suspension design engineer, or electronics lead." error={errors.position}>
            <input id="position" name="position" className="input" maxLength={80} defaultValue={s?.position ?? ""} {...invalid(errors.position, "position", true)} />
          </Field>
        </div>
        <Field name="major" label="Major" error={errors.major}>
          <input id="major" name="major" className="input" maxLength={120} autoComplete="off" defaultValue={s?.major ?? ""} {...invalid(errors.major, "major")} />
        </Field>
        <div className="form-row">
          <fieldset className="field">
            <legend className="field-label">Graduation</legend>
            <div className="field-pair">
              <select name="grad_semester" aria-label="Graduation semester" className="input" defaultValue={s?.grad_semester ?? ""}>
                <option value="">Semester</option>
                {GRAD_SEMESTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select name="grad_year" aria-label="Graduation year" className="input" defaultValue={s?.grad_year ?? ""} aria-invalid={errors.grad_year ? true : undefined} aria-describedby={errors.grad_year ? "grad_year-error" : undefined}>
                <option value="">Year</option>
                {gradYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {errors.grad_year && <p id="grad_year-error" className="field-error">{errors.grad_year}</p>}
          </fieldset>
          <div className="field">
            <label className="field-label" htmlFor="gpa">
              GPA <span className="field-optional">(optional)</span>
            </label>
            <input id="gpa" name="gpa" className="input input-short" inputMode="decimal" maxLength={4} defaultValue={s?.gpa?.toFixed(2) ?? ""} {...invalid(errors.gpa, "gpa")} />
            <label className="check">
              <input type="checkbox" name="gpa_visible" defaultChecked={s?.gpa_visible ?? false} />
              <span>Show my GPA to Partners</span>
            </label>
            {errors.gpa && <p id="gpa-error" className="field-error">{errors.gpa}</p>}
          </div>
        </div>
      </section>

      <section className="panel profile-section" aria-labelledby="looking-title">
        <h2 id="looking-title">What you&apos;re looking for</h2>
        <fieldset className="field">
          <legend className="field-label">Career interest</legend>
          <div className="segmented">
            {CAREER_INTEREST.map((option) => (
              <label key={option.value} className="segment">
                <input type="radio" name="career_interest" value={option.value} defaultChecked={s?.career_interest === option.value} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="field" aria-describedby="citizenship-hint">
          <legend className="field-label">Work authorization</legend>
          <p className="field-hint" id="citizenship-hint">
            Some roles need U.S. citizenship or a green card, and Partners can filter for them.
          </p>
          <div className="choice-list">
            {CITIZENSHIP.map((option) => (
              <label key={option.value} className="check">
                <input type="radio" name="citizenship" value={option.value} defaultChecked={s?.citizenship === option.value} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="panel profile-section" aria-labelledby="work-title">
        <h2 id="work-title">Your work on the car</h2>
        <Field name="technical_focus" label="Technical focus" hint="One line. For example: embedded software and controls." error={errors.technical_focus}>
          <input id="technical_focus" name="technical_focus" className="input" maxLength={80} defaultValue={s?.technical_focus ?? ""} {...invalid(errors.technical_focus, "technical_focus", true)} />
        </Field>
        <div className="field">
          <label className="field-label" htmlFor="project_experience">
            What you built
          </label>
          <textarea
            id="project_experience"
            name="project_experience"
            className="input textarea-tall"
            maxLength={3000}
            defaultValue={s?.project_experience ?? ""}
            onChange={(event) => setProjectWords(countWords(event.target.value))}
            aria-describedby="project_experience-hint project_experience-count"
            aria-invalid={errors.project_experience ? true : undefined}
          />
          <div className="field-foot">
            <p className="field-hint" id="project_experience-hint">
              The parts or systems you personally designed, built or tested, and what came of them. Recruiters skim, so lead with the result.
            </p>
            <p className="field-count num" id="project_experience-count" data-over={projectWords > MAX_WORDS || undefined}>
              {projectWords} of {MAX_WORDS} words
            </p>
          </div>
          {errors.project_experience && <p className="field-error">{errors.project_experience}</p>}
        </div>
      </section>

      <section className="panel profile-section" aria-labelledby="skills-title">
        <div className="section-head">
          <h2 id="skills-title">Skills</h2>
          <p className="field-hint num" aria-live="polite">
            {picked.size} of {MAX_SKILLS} picked
          </p>
        </div>
        {categories.map((category) => (
          <fieldset key={category} className="skill-group">
            <legend className="skill-group-name">{category}</legend>
            <div className="skill-chips">
              {skills
                .filter((skill) => skill.category === category)
                .map((skill) => {
                  const checked = picked.has(skill.id);
                  return (
                    <label key={skill.id} className="skill-chip">
                      <input
                        type="checkbox"
                        name="skills"
                        value={skill.id}
                        checked={checked}
                        disabled={!checked && atLimit}
                        onChange={() =>
                          setPicked((current) => {
                            const next = new Set(current);
                            if (next.has(skill.id)) next.delete(skill.id);
                            else next.add(skill.id);
                            return next;
                          })
                        }
                      />
                      <span>{skill.name}</span>
                    </label>
                  );
                })}
            </div>
          </fieldset>
        ))}
        {errors.skills && <p className="field-error">{errors.skills}</p>}
      </section>

      <section className="panel profile-section" aria-labelledby="links-title">
        <h2 id="links-title">Links</h2>
        <Field name="linkedin_url" label="LinkedIn" error={errors.linkedin_url}>
          <input id="linkedin_url" name="linkedin_url" className="input" inputMode="url" autoComplete="url" defaultValue={s?.linkedin_url ?? ""} {...invalid(errors.linkedin_url, "linkedin_url")} />
        </Field>
        <div className="form-row">
          <Field name="github_url" label="GitHub" optional error={errors.github_url}>
            <input id="github_url" name="github_url" className="input" inputMode="url" defaultValue={s?.github_url ?? ""} {...invalid(errors.github_url, "github_url")} />
          </Field>
          <Field name="portfolio_url" label="Personal site" optional error={errors.portfolio_url}>
            <input id="portfolio_url" name="portfolio_url" className="input" inputMode="url" defaultValue={s?.portfolio_url ?? ""} {...invalid(errors.portfolio_url, "portfolio_url")} />
          </Field>
        </div>
      </section>

      <div className="save-bar">
        <p className="save-bar-status" role="status">
          {state.status === "error" ? (
            <span className="save-bar-error">{state.message}</span>
          ) : dirty ? (
            "Unsaved changes"
          ) : state.status === "saved" ? (
            "Profile saved"
          ) : (
            ""
          )}
        </p>
        <SubmitButton busy={saving} pendingLabel="Saving">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  hint,
  error,
  optional,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={name}>
        {label} {optional && <span className="field-optional">(optional)</span>}
      </label>
      {children}
      {hint && (
        <p className="field-hint" id={`${name}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

// aria wiring for an input whose hint and error sit beside it in a Field.
function invalid(error: string | undefined, name: string, hasHint = false) {
  const describedBy = [hasHint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(" ");
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  } as const;
}
