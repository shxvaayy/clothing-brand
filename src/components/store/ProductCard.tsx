import Link from "next/link";
import Image from "next/image";
import type { ProductCard as Card } from "@/lib/products";
import { Price } from "@/components/ui/Price";
import WishButton from "./WishButton";

export default function ProductCard({ product, priority }: { product: Card; priority?: boolean }) {
  return (
    <div className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-cream-200">
          {product.image ? (
            <>
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className={`object-cover transition-all duration-500 ${
                  product.hoverImage ? "group-hover:opacity-0" : "group-hover:scale-[1.04]"
                }`}
                priority={priority}
              />
              {product.hoverImage && (
                <Image
                  src={product.hoverImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-ink-300">No image</div>
          )}

          {/* badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.soldOut ? (
              <span className="bg-ink-800/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                Sold out
              </span>
            ) : (
              <>
                {product.newArrival && (
                  <span className="bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-800">
                    New
                  </span>
                )}
                {product.bestSeller && (
                  <span className="bg-terra-500/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Bestseller
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute right-2 top-2">
        <WishButton productId={product.id} />
      </div>

      <div className="pt-2.5">
        <Link href={`/product/${product.slug}`}>
          <h3 className="truncate text-[13px] font-medium text-ink-800 sm:text-sm">{product.name}</h3>
        </Link>
        <div className="mt-1">
          <Price mrp={product.mrp} price={product.price} size="sm" />
        </div>
        {product.colors.length > 1 && (
          <div className="mt-1.5 flex gap-1" aria-label={`${product.colors.length} colours`}>
            {product.colors.map((c, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full border border-cream-400"
                style={{ background: c.startsWith("#") ? c : undefined }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
