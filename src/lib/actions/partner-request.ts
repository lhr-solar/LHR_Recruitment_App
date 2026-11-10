"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const https = z
  .string()
  .trim()
  .transform((value) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value))
  .pipe(z.union([z.literal(""), z.url({ protocol: /^https$/ })]));

const schema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.email("Enter your work email, like name@company.com.").transform((value) => value.toLowerCase()),
  title: z.string().trim().max(120),
  companyName: z.string().trim().min(1, "Enter your company's name.").max(160),
  companyWebsite: https,
  message: z.string().trim().max(1000),
});

export type PartnerRequestState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "error"; message: string; fieldErrors: Partial<Record<keyof z.infer<typeof schema>, string>> };

export async function submitPartnerRequest(_prev: PartnerRequestState, formData: FormData): Promise<PartnerRequestState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const parsed = schema.safeParse({
    fullName: formData.get("fullName") ?? "",
    // A signed-in Partner requests access for the account they are signed in with.
    email: user?.email ?? formData.get("email") ?? "",
    title: formData.get("title") ?? "",
    companyName: formData.get("companyName") ?? "",
    companyWebsite: formData.get("companyWebsite") ?? "",
    message: formData.get("message") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= key === "companyWebsite" ? "Enter a website address, like company.com." : issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }

  const values = parsed.data;
  const { error } = await supabase.from("partner_access_requests").insert({
    user_id: user?.id ?? null,
    email: values.email,
    full_name: values.fullName,
    title: values.title || null,
    company_name: values.companyName,
    company_website: values.companyWebsite || null,
    message: values.message || null,
  });

  if (error) {
    return { status: "error", message: "We couldn't send your request. Try again in a minute.", fieldErrors: {} };
  }

  revalidatePath("/pending");
  return { status: "sent" };
}
