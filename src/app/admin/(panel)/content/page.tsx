import { db } from "@/lib/db";
import ContentEditor from "@/components/admin/ContentEditor";

export const metadata = { title: "Pages · Admin" };

export default async function ContentAdminPage() {
  const pages = await db.contentPage.findMany({ orderBy: { slug: "asc" } });
  return (
    <div>
      <h1 className="mb-1 font-display text-2xl">Content pages</h1>
      <p className="mb-5 text-sm text-ink-400">
        About, FAQ, shipping, returns, policies — edit without touching code. Supports simple markdown
        (## headings, - lists, **bold**, [links](/path), | tables |).
      </p>
      <ContentEditor
        pages={pages.map((p) => ({
          slug: p.slug,
          title: p.title,
          body: p.body,
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
          published: p.published,
        }))}
      />
    </div>
  );
}
