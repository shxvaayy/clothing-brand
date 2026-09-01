import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PreviewFrameSwitcher from "@/components/admin/PreviewFrameSwitcher";

export const metadata = { title: "Preview · Admin" };

export default async function ProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { name: true, status: true, draftData: true } });
  if (!product) notFound();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Preview: {product.name}</h1>
          <p className="text-xs text-ink-400">
            {product.draftData
              ? "Showing your unpublished draft changes"
              : "Showing the current saved state"}
          </p>
        </div>
        <Link
          href={`/admin/products/${id}`}
          className="border border-cream-400 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider"
        >
          ← Back to editor
        </Link>
      </div>
      <PreviewFrameSwitcher src={`/admin/preview/${id}`} />
    </div>
  );
}
