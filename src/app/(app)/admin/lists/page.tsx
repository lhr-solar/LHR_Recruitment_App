import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TEAMS } from "@/lib/teams";
import { setListItemActive } from "./actions";
import { AddSkillForm, AddSubsystemForm } from "./list-forms";

export const metadata: Metadata = { title: "Lists" };

type Item = { id: string; name: string; active: boolean };

export default async function ListsPage() {
  const viewer = await requireStaff();
  if (!viewer.isAdmin) redirect("/admin");

  const supabase = await createClient();
  const [skills, subsystems] = await Promise.all([
    supabase.from("skills").select("id, name, category, active").order("category").order("name"),
    supabase.from("subsystems").select("id, name, team, active").order("sort").order("name"),
  ]);
  const byCategory = new Map<string, Item[]>();
  for (const skill of skills.data ?? []) byCategory.set(skill.category, [...(byCategory.get(skill.category) ?? []), skill]);

  return (
    <div className="admin-stack">
      <header className="page-head">
        <h1>Lists</h1>
        <p>The skills and subsystems students pick from on their profile, and Partners filter the resume book by. Hiding one keeps it on profiles that already have it.</p>
      </header>

      <section className="panel profile-section" aria-labelledby="subsystems-title">
        <h2 id="subsystems-title">Subsystems</h2>
        <div className="lists-teams">
          {TEAMS.map((team) => (
            <div key={team.slug} className="lists-team">
              <h3>
                <span className="book-team-dot" data-team={team.slug} aria-hidden="true" />
                {team.name}
              </h3>
              <ul className="list-items">
                {(subsystems.data ?? [])
                  .filter((s) => s.team === team.slug)
                  .map((s) => (
                    <ListItem key={s.id} list="subsystems" item={s} />
                  ))}
              </ul>
              <AddSubsystemForm team={team.slug} teamName={team.name} />
            </div>
          ))}
        </div>
      </section>

      <section className="panel profile-section" aria-labelledby="skills-title">
        <h2 id="skills-title">Skills</h2>
        <AddSkillForm categories={[...byCategory.keys()]} />
        <div className="lists-skills">
          {[...byCategory].map(([category, items]) => (
            <div key={category} className="lists-team">
              <h3>{category}</h3>
              <ul className="list-items">
                {items.map((s) => (
                  <ListItem key={s.id} list="skills" item={s} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ListItem({ list, item }: { list: "skills" | "subsystems"; item: Item }) {
  return (
    <li data-hidden={item.active ? undefined : ""}>
      <span>
        {item.name}
        {!item.active && <span className="list-hidden"> · Hidden</span>}
      </span>
      <form action={setListItemActive}>
        <input type="hidden" name="list" value={list} />
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="active" value={item.active ? "false" : "true"} />
        <button type="submit" className="btn btn-quiet list-toggle" aria-label={`${item.active ? "Hide" : "Show"} ${item.name}`}>
          {item.active ? "Hide" : "Show"}
        </button>
      </form>
    </li>
  );
}
