"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CompanyLogo } from "@/components/job-view";
import { SubmitButton } from "@/components/submit-button";
import { formatDeadline, JOB_TYPES, jobTypeLabel, MAX_DESCRIPTION, MAX_LOCATION, MAX_TITLE, whereLine, type JobStatus } from "@/lib/job-options";
import type { JobCompany } from "@/lib/jobs";
import { TEAMS } from "@/lib/teams";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { saveJob, type JobFormState } from "./actions";

export type JobDraft = {
  id: string | null;
  title: string;
  type: string;
  location: string | null;
  remote: boolean;
  description: string;
  applyUrl: string;
  teams: string[];
  deadline: string | null;
  status: JobStatus;
};

type Preview = Pick<JobDraft, "title" | "type" | "location" | "remote" | "teams" | "deadline">;

function readPreview(form: HTMLFormElement): Preview {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? "").trim();
  return {
    title: text("title"),
    type: text("job_type"),
    location: text("location") || null,
    remote: data.has("is_remote"),
    teams: data.getAll("target_teams").map(String),
    deadline: text("deadline") || null,
  };
}

export function JobForm({ job, today, company }: { job: JobDraft; today: string; company: JobCompany }) {
  const [state, setState] = useState<JobFormState>({ status: "idle" });
  const [saving, startSaving] = useTransition();
  const [intent, setIntent] = useState<string | null>(null);
  // Edits since the last attempt; a successful save leaves the page, so only failures come back here.
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty && !saving);
  const [length, setLength] = useState(job.description.length);
  const [preview, setPreview] = useState<Preview>(job);
  const errors = state.status === "error" ? state.fieldErrors : {};

  // Submitting by hand keeps what was typed if the save fails (a form action would reset it).
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    setIntent(String(formData.get("intent")));
    startSaving(async () => {
      const result = await saveJob(state, formData);
      // Only failures return; a successful save redirects to the post.
      setState(result);
    });
  }

  const invalid = (name: string) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};
  const error = (name: string) =>
    errors[name] && (
      <p className="field-error" id={`${name}-error`}>
        {errors[name]}
      </p>
    );

  return (
    <form
      onSubmit={onSubmit}
      onChange={(event) => {
        setDirty(true);
        setPreview(readPreview(event.currentTarget));
      }}
      className="profile-grid job-form-grid"
      noValidate
    >
      <div className="profile-main">
        {job.id && <input type="hidden" name="id" value={job.id} />}

        <section className="panel profile-section" aria-labelledby="role-title">
          <h2 id="role-title">The role</h2>
          <div className="field">
            <label className="field-label" htmlFor="title">
              Title
            </label>
            <input id="title" name="title" className="input" maxLength={MAX_TITLE} defaultValue={job.title} placeholder="Powertrain engineering intern" {...invalid("title")} />
            {error("title")}
          </div>

          <fieldset className="field">
            <legend className="field-label">Kind of role</legend>
            <div className="segmented">
              {JOB_TYPES.map((type) => (
                <label key={type.value} className="segment">
                  <input type="radio" name="job_type" value={type.value} defaultChecked={job.type === type.value} />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
            {error("job_type")}
          </fieldset>

          <div className="form-row">
            <div className="field">
              <label className="field-label" htmlFor="location">
                Location <span className="field-optional">(optional)</span>
              </label>
              <input id="location" name="location" className="input" maxLength={MAX_LOCATION} defaultValue={job.location ?? ""} placeholder="Austin, TX" {...invalid("location")} />
              {error("location")}
            </div>
            <div className="field job-remote">
              <label className="check">
                <input type="checkbox" name="is_remote" defaultChecked={job.remote} />
                Remote work is possible
              </label>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <p className="field-hint" id="description-hint">
              What the engineer will work on, what you&apos;re looking for, and anything students should know before applying.
            </p>
            <textarea
              id="description"
              name="description"
              className="input job-textarea"
              maxLength={MAX_DESCRIPTION}
              defaultValue={job.description}
              onInput={(event) => setLength(event.currentTarget.value.length)}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={`description-hint description-count${errors.description ? " description-error" : ""}`}
            />
            <div className="field-foot">
              {error("description") ?? <span />}
              <span className="field-count" id="description-count">
                {length.toLocaleString("en-US")} / {MAX_DESCRIPTION.toLocaleString("en-US")}
              </span>
            </div>
          </div>
        </section>

        <section className="panel profile-section" aria-labelledby="apply-title">
          <h2 id="apply-title">Applying</h2>
          <div className="field">
            <label className="field-label" htmlFor="apply_url">
              Application link
            </label>
            <p className="field-hint" id="apply_url-hint">
              Students apply on your site. We send them to this page and count the clicks.
            </p>
            <input
              id="apply_url"
              name="apply_url"
              className="input"
              inputMode="url"
              defaultValue={job.applyUrl}
              placeholder="careers.acme.com/jobs/123"
              aria-invalid={errors.apply_url ? true : undefined}
              aria-describedby={`apply_url-hint${errors.apply_url ? " apply_url-error" : ""}`}
            />
            {error("apply_url")}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="deadline">
              Deadline <span className="field-optional">(optional)</span>
            </label>
            <p className="field-hint" id="deadline-hint">
              The post leaves the job board after this day.
            </p>
            <input
              id="deadline"
              name="deadline"
              type="date"
              className="input input-date"
              min={today}
              defaultValue={job.deadline ?? ""}
              aria-invalid={errors.deadline ? true : undefined}
              aria-describedby={`deadline-hint${errors.deadline ? " deadline-error" : ""}`}
            />
            {error("deadline")}
          </div>

          <fieldset className="field">
            <legend className="field-label">
              Teams <span className="field-optional">(optional)</span>
            </legend>
            <p className="field-hint">Leave these blank to post for every team. Students can still see posts for other teams.</p>
            <div className="choice-list">
              {TEAMS.map((team) => (
                <label key={team.slug} className="check">
                  <input type="checkbox" name="target_teams" value={team.slug} defaultChecked={job.teams.includes(team.slug)} />
                  <span className="book-team-dot" data-team={team.slug} aria-hidden="true" />
                  {team.name}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <div className="save-bar">
          <p className="save-bar-status" role="status">
            {state.status === "error" ? <span className="save-bar-error">{state.message}</span> : dirty ? "Unsaved changes" : ""}
          </p>
          <Link href={job.id ? `/partner/jobs/${job.id}` : "/partner/jobs"} className="btn btn-quiet">
            Cancel
          </Link>
          {job.status === "draft" ? (
            <>
              <SubmitButton variant="secondary" name="intent" value="draft" busy={saving && intent === "draft"} pendingLabel="Saving">
                Save draft
              </SubmitButton>
              <SubmitButton name="intent" value="publish" busy={saving && intent === "publish"} pendingLabel="Publishing">
                Publish
              </SubmitButton>
            </>
          ) : (
            <SubmitButton name="intent" value="save" busy={saving} pendingLabel="Saving">
              Save changes
            </SubmitButton>
          )}
        </div>
      </div>

      <aside className="profile-aside" aria-labelledby="job-preview-title">
        <section className="panel job-preview">
          <h2 id="job-preview-title" className="job-preview-title">
            On the job board
          </h2>
          <div className="job-preview-card">
            <CompanyLogo company={company} size={40} />
            <div className="board-card-body">
              <p className="job-company">{company.name}</p>
              <h3 data-empty={preview.title ? undefined : ""}>{preview.title || "Your job title"}</h3>
              <p className="book-card-facts">
                {[jobTypeLabel(preview.type), whereLine(preview.location, preview.remote), previewTeams(preview.teams)].filter(Boolean).join(" · ")}
              </p>
              {preview.deadline && <p className="cell-secondary">Apply by {formatDeadline(preview.deadline)}</p>}
            </div>
          </div>
          <p className="field-hint">Students open the post for the description, then apply through your link.</p>
        </section>
      </aside>
    </form>
  );
}

function previewTeams(teams: string[]) {
  const names = TEAMS.filter((t) => teams.includes(t.slug)).map((t) => t.name);
  return names.length ? `For ${names.join(", ")}` : null;
}
