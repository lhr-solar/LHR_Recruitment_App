// Renders the Supabase sign-in email (magic link and confirm signup) into
// supabase/templates/sign-in.html, from the same layout as the app's other emails.
//
//   node scripts/write-sign-in-template.mjs
//
// Then paste the file into Supabase → Authentication → Emails → Magic Link and Confirm signup.
import { writeFileSync } from "node:fs";
import { signInEmail } from "../src/lib/email-templates.ts";

writeFileSync(new URL("../supabase/templates/sign-in.html", import.meta.url), `${signInEmail().html}\n`);
console.log("Wrote supabase/templates/sign-in.html");
