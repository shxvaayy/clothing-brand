import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Collections",
  description: "Explore Rare Naari collections — each one a small, considered story.",
  path: "/collections",
});

export default async function CollectionsPage() {
  const collections = await db.collection.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl text-ink-900 sm:text-4xl">Collections</h1>
      <p className="mt-1 text-sm text-ink-400">Each collection is a small, considered story.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <Link key={c.id} href={`/collections/${c.slug}`} className="group relative block overflow-hidden bg-cream-200">
            <div className="relative aspect-[4/3]">
              {c.image && (
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h2 className="font-display text-xl text-white sm:text-2xl">{c.name}</h2>
                <p className="text-xs text-cream-100/90">{c._count.products} pieces</p>
              </div>
            </div>
          </Link>
        ))}
        {collections.length === 0 && (
          <p className="col-span-full py-16 text-center text-sm text-ink-400">No collections yet.</p>
        )}
      </div>
    </div>
  );
}
