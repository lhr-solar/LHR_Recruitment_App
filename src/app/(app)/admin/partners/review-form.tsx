"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { reviewPartnerRequest } from "./actions";

type Props = {
  requestId: string;
  companyName: string;
  companies: { id: string; name: string }[];
  // An existing company whose name matches the request, picked by default.
  match: string | null;
};

export function ReviewForm({ requestId, companyName, companies, match }: Props) {
  const [state, action] = useActionState(reviewPartnerRequest, { error: null });

  return (
    <form action={action} className="review-form">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="visually-hidden" htmlFor={`company-${requestId}`}>
        Company for this recruiter
      </label>
      <select id={`company-${requestId}`} name="company" className="input" defaultValue={match ?? "new"}>
        {!match && <option value="new">New company: {companyName}</option>}
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
      <div className="row-actions">
        <SubmitButton name="decision" value="approve" pendingLabel="Approving">
          Approve
        </SubmitButton>
        <SubmitButton name="decision" value="decline" variant="danger" pendingLabel="Declining">
          Decline
        </SubmitButton>
      </div>
      {state.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
