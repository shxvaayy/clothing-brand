"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type HeroSlide = {
  image: string;
  mobileImage?: string;
  eyebrow?: string;
  headline?: string;
  subheading?: string;
  ctaText?: string;
  ctaLink?: string;
};

const INTERVAL_MS = 5000;

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = setInterval(() => setActive((a) => (a + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  const go = (i: number) => setActive((i + slides.length) % slides.length);

  return (
    <section
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 48) go(active + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {/* container aspect matches the baked slide canvases exactly, so the
          artwork is never cropped at any viewport */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream-200 sm:aspect-[24/11]">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== active}
          >
            {/* desktop image */}
            <Image
              src={slide.image}
              alt={slide.headline ?? "Rare Naari"}
              fill
              sizes="100vw"
              priority={i === 0}
              className={`object-cover ${slide.mobileImage ? "hidden sm:block" : ""}`}
            />
            {/* mobile-safe crop */}
            {slide.mobileImage && (
              <Image
                src={slide.mobileImage}
                alt=""
                fill
                sizes="100vw"
                priority={i === 0}
                className="object-cover sm:hidden"
              />
            )}
            {/* readability overlay only on mobile, where text sits on the photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-ink-900/10 to-ink-900/10 sm:hidden" />

            <div className="absolute inset-x-0 bottom-0 p-6 pb-14 text-center sm:inset-y-0 sm:right-auto sm:flex sm:w-1/2 sm:flex-col sm:justify-center sm:px-16 sm:pb-0 sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-cream-100/90">
                {slide.eyebrow ?? "New Season"}
              </p>
              {slide.headline && (
                <h1 className="mt-3 font-display text-4xl leading-[1.05] text-white sm:max-w-2xl sm:text-6xl md:text-7xl">
                  {slide.headline}
                </h1>
              )}
              {slide.subheading && (
                <p className="mx-auto mt-3 max-w-xl text-sm text-cream-100/90 sm:mx-0 sm:text-base">
                  {slide.subheading}
                </p>
              )}
              {slide.ctaText && (
                <Link
                  href={slide.ctaLink ?? "/shop"}
                  className="mt-7 inline-block border border-cream-50/80 bg-cream-50 px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-ink-900 transition-colors hover:bg-transparent hover:text-cream-50 sm:self-start"
                >
                  {slide.ctaText}
                </Link>
              )}
            </div>
          </div>
        ))}

        {/* dots */}
        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 sm:justify-start sm:px-16">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === active}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === active ? "w-8 bg-cream-50" : "w-4 bg-cream-50/40 hover:bg-cream-50/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
