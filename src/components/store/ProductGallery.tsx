"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type Img = { url: string; alt: string | null };

export default function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center bg-cream-200 text-ink-300">
        No image
      </div>
    );
  }

  const scrollTo = (i: number) => {
    setActive(i);
    const el = scroller.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      {/* Mobile: swipeable snap gallery */}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== active) setActive(i);
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:hidden"
        aria-label={`${name} images`}
      >
        {images.map((img, i) => (
          <div key={i} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-cream-200">
            <Image
              src={img.url}
              alt={img.alt || `${name} — image ${i + 1}`}
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {/* Mobile dots */}
      {images.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 lg:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to image ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-5 bg-terra-500" : "w-1.5 bg-cream-400"
              }`}
            />
          ))}
        </div>
      )}

      {/* Desktop: main + thumbnails */}
      <div className="hidden gap-3 lg:flex">
        {images.length > 1 && (
          <div className="flex w-20 flex-col gap-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                className={`relative aspect-[3/4] overflow-hidden bg-cream-200 ${
                  i === active ? "ring-2 ring-terra-500" : "opacity-80 hover:opacity-100"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="relative aspect-[3/4] flex-1 overflow-hidden bg-cream-200">
          <Image
            src={images[active].url}
            alt={images[active].alt || name}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            priority
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
