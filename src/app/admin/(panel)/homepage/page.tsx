import { db } from "@/lib/db";
import HomepageManager from "@/components/admin/HomepageManager";

export const metadata = { title: "Homepage · Admin" };

export default async function HomepageAdminPage() {
  const [sections, collections] = await Promise.all([
    db.homepageSection.findMany({ orderBy: { sortOrder: "asc" } }),
    db.collection.findMany({ where: { published: true }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl">Homepage</h1>
      <p className="mb-5 text-sm text-ink-400">
        Add, edit, reorder and publish sections. The store homepage updates immediately.
      </p>
      <HomepageManager
        sections={sections.map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title,
          subtitle: s.subtitle,
          config: (s.config ?? {}) as Record<string, unknown>,
          published: s.published,
        }))}
        collections={collections}
      />
    </div>
  );
}
