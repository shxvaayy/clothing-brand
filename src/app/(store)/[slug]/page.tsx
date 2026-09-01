import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { renderMarkdown } from "@/lib/markdown";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/store/ContactForm";

// CMS-managed pages served at the root level (about, faq, shipping, ...)
const CMS_SLUGS = new Set([
  "about",
  "contact",
  "faq",
  "shipping",
  "returns",
  "privacy",
  "terms",
  "size-guide",
]);

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (!CMS_SLUGS.has(slug)) return {};
  const page = await db.contentPage.findUnique({ where: { slug } });
  if (!page) return {};
  return pageMetadata({
    title: page.seoTitle || page.title,
    description: page.seoDescription ?? undefined,
    path: `/${slug}`,
  });
}

export default async function ContentPageRoute({ params }: Props) {
  const { slug } = await params;
  if (!CMS_SLUGS.has(slug)) notFound();
  const page = await db.contentPage.findUnique({ where: { slug } });
  if (!page || !page.published) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl text-ink-900 sm:text-4xl">{page.title}</h1>
      <div
        className="rn-prose mt-6 text-[15px]"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }}
      />
      {slug === "contact" && <ContactForm />}
    </div>
  );
}
