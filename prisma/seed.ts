import "dotenv/config";
import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ---------------------------------------------------------------- images
// Elegant tonal placeholder images generated locally (seed/demo data only).

const OUT_DIR = path.join(process.cwd(), "public", "uploads", "seed");

function svgPlaceholder(opts: {
  base: string;
  accent: string;
  label: string;
  variant: number;
  w?: number;
  h?: number;
}) {
  const { base, accent, label, variant } = opts;
  const w = opts.w ?? 900;
  const h = opts.h ?? 1200;
  const motif =
    variant % 2 === 0
      ? `<circle cx="${w * 0.72}" cy="${h * 0.3}" r="${w * 0.38}" fill="${accent}" opacity="0.25"/>
         <circle cx="${w * 0.25}" cy="${h * 0.78}" r="${w * 0.3}" fill="${accent}" opacity="0.18"/>`
      : `<ellipse cx="${w * 0.3}" cy="${h * 0.25}" rx="${w * 0.42}" ry="${w * 0.3}" fill="${accent}" opacity="0.22"/>
         <circle cx="${w * 0.78}" cy="${h * 0.72}" r="${w * 0.34}" fill="${accent}" opacity="0.16"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${base}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${motif}
  <g opacity="0.85">
    <path d="M ${w / 2 - 90} ${h * 0.42} q 90 -110 180 0 q -20 60 -40 90 l 30 220 q -80 40 -160 0 l 30 -220 q -20 -30 -40 -90 z"
      fill="none" stroke="#fdfbf7" stroke-width="5"/>
  </g>
  <text x="${w / 2}" y="${h - 90}" text-anchor="middle" font-family="Georgia, serif"
    font-size="40" letter-spacing="6" fill="#fdfbf7" opacity="0.9">${label.toUpperCase()}</text>
  <text x="${w / 2}" y="${h - 46}" text-anchor="middle" font-family="Georgia, serif"
    font-size="22" letter-spacing="8" fill="#fdfbf7" opacity="0.65">RARE NAARI</text>
</svg>`;
}

async function makeImage(name: string, opts: Parameters<typeof svgPlaceholder>[0]) {
  const file = path.join(OUT_DIR, `${name}.jpg`);
  await sharp(Buffer.from(svgPlaceholder(opts))).jpeg({ quality: 82 }).toFile(file);
  return `/uploads/seed/${name}.jpg`;
}

async function makeWide(name: string, opts: Omit<Parameters<typeof svgPlaceholder>[0], "w" | "h">) {
  const file = path.join(OUT_DIR, `${name}.jpg`);
  await sharp(Buffer.from(svgPlaceholder({ ...opts, w: 1600, h: 900 })))
    .jpeg({ quality: 82 })
    .toFile(file);
  return `/uploads/seed/${name}.jpg`;
}

// ---------------------------------------------------------------- data

const TONES: Record<string, { base: string; accent: string; hex: string }> = {
  terracotta: { base: "#a85b44", accent: "#c07d62", hex: "#a85b44" },
  ivory: { base: "#d8c6ae", accent: "#eadfd2", hex: "#f3ede2" },
  sage: { base: "#7d8b6f", accent: "#a3b294", hex: "#8a9a7b" },
  dusk: { base: "#5c4a5e", accent: "#8a7391", hex: "#6b5a6e" },
  blush: { base: "#c98d8a", accent: "#e2b6b3", hex: "#d9a5a2" },
  indigo: { base: "#3d4a6b", accent: "#5f7099", hex: "#46547a" },
  black: { base: "#2b2320", accent: "#4f4239", hex: "#2b2320" },
  mustard: { base: "#b98a3a", accent: "#d4ab5e", hex: "#c39745" },
};

type SeedProduct = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number; // rupees
  mrp: number;
  short: string;
  description: string;
  fabric: string;
  fit: string;
  care: string;
  tones: (keyof typeof TONES)[];
  tags: string[];
  bestSeller?: boolean;
  newArrival?: boolean;
  onSale?: boolean;
  featured?: boolean;
  collections?: string[];
};

const PRODUCTS: SeedProduct[] = [
  {
    name: "Lotus Bloom Kurta Set", slug: "lotus-bloom-kurta-set", sku: "RN-KUR-001",
    category: "kurta-sets", price: 2499, mrp: 3499,
    short: "Three-piece kurta set with hand-finished lotus embroidery",
    description: "A breathable cotton kurta set inspired by the lotus in our crest. The straight-cut kurta falls to mid-calf, paired with tapered pants and a soft mulmul dupatta. Finished with wooden buttons and side slits for ease of movement.",
    fabric: "100% Cotton Cambric", fit: "Straight fit, true to size", care: "Gentle machine wash cold, line dry in shade",
    tones: ["terracotta", "ivory"], tags: ["kurta", "kurta set", "festive", "cotton"],
    bestSeller: true, featured: true, collections: ["festive-edit"],
  },
  {
    name: "Meera Chikankari Kurta", slug: "meera-chikankari-kurta", sku: "RN-KUR-002",
    category: "kurta-sets", price: 1899, mrp: 2599,
    short: "Lucknowi chikankari on soft mul cotton",
    description: "Classic chikankari worked by hand on feather-light mul cotton. The Meera kurta layers beautifully over slip dresses and denims alike. Slightly sheer — a camisole is included.",
    fabric: "Mul Cotton with hand embroidery", fit: "Relaxed fit", care: "Hand wash separately",
    tones: ["ivory", "blush"], tags: ["kurta", "chikankari", "handwork"],
    newArrival: true, collections: ["everyday-luxe"],
  },
  {
    name: "Wildflower Wrap Dress", slug: "wildflower-wrap-dress", sku: "RN-DRS-001",
    category: "dresses", price: 2199, mrp: 2999,
    short: "A true-wrap midi in breezy viscose crepe",
    description: "A proper wrap — no fake ties. The Wildflower midi cinches where you want it and floats everywhere else, with a soft V-neck and flutter sleeves. Pockets, obviously.",
    fabric: "Viscose Crepe", fit: "Wrap silhouette, adjustable", care: "Machine wash gentle",
    tones: ["sage", "dusk"], tags: ["dress", "midi", "wrap dress"],
    bestSeller: true, newArrival: true, collections: ["everyday-luxe"],
  },
  {
    name: "Dusk Maxi Dress", slug: "dusk-maxi-dress", sku: "RN-DRS-002",
    category: "dresses", price: 2799, mrp: 3999,
    short: "Floor-grazing tiered maxi for slow evenings",
    description: "Three graceful tiers, a smocked back bodice and adjustable straps. The Dusk maxi moves like dusk light — slow and warm. Lined to the knee.",
    fabric: "Cotton Dobby", fit: "Relaxed, tiered", care: "Machine wash cold",
    tones: ["dusk", "black"], tags: ["dress", "maxi", "evening"],
    onSale: true, collections: ["festive-edit"],
  },
  {
    name: "Sage Everyday Co-ord", slug: "sage-everyday-co-ord", sku: "RN-CRD-001",
    category: "co-ord-sets", price: 2599, mrp: 3299,
    short: "Boxy shirt + wide-leg pants in crinkle cotton",
    description: "The co-ord you reach for twice a week: a boxy camp-collar shirt and easy wide-leg pants in pre-crinkled cotton that's meant to look lived-in. Wear together or split them across your wardrobe.",
    fabric: "Crinkle Cotton", fit: "Boxy shirt, relaxed pants", care: "Machine wash, no ironing needed",
    tones: ["sage", "ivory"], tags: ["co-ord", "set", "casual"],
    bestSeller: true, featured: true, collections: ["everyday-luxe"],
  },
  {
    name: "Terra Linen Co-ord", slug: "terra-linen-co-ord", sku: "RN-CRD-002",
    category: "co-ord-sets", price: 3299, mrp: 4499,
    short: "Sleeveless vest + trousers in pure linen",
    description: "Our sharpest set — a tailored sleeveless vest with corozo buttons and high-waist straight trousers, cut in breathable European flax linen in our signature terracotta.",
    fabric: "100% Linen", fit: "Tailored", care: "Dry clean recommended",
    tones: ["terracotta", "black"], tags: ["co-ord", "linen", "workwear"],
    newArrival: true, collections: ["festive-edit", "everyday-luxe"],
  },
  {
    name: "Ivory Muslin Top", slug: "ivory-muslin-top", sku: "RN-TOP-001",
    category: "tops", price: 1299, mrp: 1799,
    short: "Feather-light muslin with pintuck detailing",
    description: "Fine pintucks, shell buttons and a gently curved hem. The Ivory muslin top goes from work calls to dinner without trying.",
    fabric: "Cotton Muslin", fit: "Regular", care: "Hand wash",
    tones: ["ivory", "blush"], tags: ["top", "muslin", "workwear"],
    newArrival: true,
  },
  {
    name: "Blush Peplum Top", slug: "blush-peplum-top", sku: "RN-TOP-002",
    category: "tops", price: 1499, mrp: 2199,
    short: "Soft peplum with a square neckline",
    description: "A flattering square neck, gathered peplum waist and just-right sleeve. Pairs with everything from palazzos to jeans.",
    fabric: "Rayon Slub", fit: "Fitted bodice, flared hem", care: "Machine wash gentle",
    tones: ["blush", "mustard"], tags: ["top", "peplum"],
    onSale: true,
  },
  {
    name: "Flared Palazzo Pants", slug: "flared-palazzo-pants", sku: "RN-BTM-001",
    category: "bottoms", price: 1599, mrp: 2299,
    short: "High-rise palazzos with a clean flat front",
    description: "A clean flat front, hidden elastic at the back and a dramatic flare. These palazzos are cut long — made to wear with flats or heels.",
    fabric: "Poly-Viscose Blend", fit: "High rise, flared", care: "Machine wash",
    tones: ["black", "indigo"], tags: ["bottoms", "palazzo"],
    bestSeller: true,
  },
  {
    name: "Straight-Fit Cotton Trousers", slug: "straight-fit-cotton-trousers", sku: "RN-BTM-002",
    category: "bottoms", price: 1799, mrp: 2499,
    short: "Everyday straight trousers with real pockets",
    description: "Mid-rise, straight through the leg, with deep pockets that actually hold a phone. The workhorse of your wardrobe.",
    fabric: "Stretch Cotton Twill", fit: "Straight", care: "Machine wash",
    tones: ["mustard", "ivory"], tags: ["bottoms", "trousers", "workwear"],
  },
  {
    name: "Banarasi Silk Saree", slug: "banarasi-silk-saree", sku: "RN-SAR-001",
    category: "sarees", price: 5999, mrp: 8999,
    short: "Handloom Banarasi with antique zari border",
    description: "Woven on handlooms in Varanasi, this silk saree carries an antique gold zari border and a scattered buti body. Comes with an unstitched blouse piece.",
    fabric: "Pure Silk, handloom", fit: "Free size, 5.5m + blouse piece", care: "Dry clean only",
    tones: ["terracotta", "indigo"], tags: ["saree", "banarasi", "silk", "wedding"],
    featured: true, collections: ["festive-edit"],
  },
  {
    name: "Pastel Organza Saree", slug: "pastel-organza-saree", sku: "RN-SAR-002",
    category: "sarees", price: 3499, mrp: 4999,
    short: "Sheer organza with scalloped embroidery edge",
    description: "Cloud-light organza with a hand-embroidered scalloped edge. Drapes sheer and holds pleats beautifully. Blouse piece included.",
    fabric: "Organza", fit: "Free size, 5.5m + blouse piece", care: "Dry clean only",
    tones: ["blush", "sage"], tags: ["saree", "organza", "occasion"],
    newArrival: true, onSale: true, collections: ["festive-edit"],
  },
  {
    name: "Noor Velvet Kurta Set", slug: "noor-velvet-kurta-set", sku: "RN-KUR-003",
    category: "kurta-sets", price: 4299, mrp: 5999,
    short: "Festive velvet set with zari neckline",
    description: "Plush micro-velvet kurta with a hand-worked zari neckline, paired with matching straight pants. Made for weddings, kept for every winter after.",
    fabric: "Micro Velvet", fit: "Straight", care: "Dry clean only",
    tones: ["dusk", "terracotta"], tags: ["kurta", "velvet", "festive", "wedding"],
    onSale: true, collections: ["festive-edit"],
  },
];

const SIZES = ["S", "M", "L", "XL"];

const CONTENT_PAGES: { slug: string; title: string; body: string }[] = [
  {
    slug: "about",
    title: "About Rare Naari",
    body: `Rare Naari is a premium Indian womenswear label — clothing for the rare ones.

## Our story
We started with a simple belief: a woman's clothes should feel like her own skin — breathable, honest and unmistakably hers. Every Rare Naari piece is designed in-house and made in small batches with fabrics we'd wear ourselves.

## What we stand for
- **Breathable fabrics** — cottons, linens, muslins and handloom silks
- **Honest pricing** — no inflated MRPs, no fake sales
- **Small batches** — when a piece is gone, it's usually gone
- **Made in India** — designed and produced with Indian karigars

Questions? Write to us on the [contact page](/contact).`,
  },
  {
    slug: "contact",
    title: "Contact Us",
    body: `We usually respond within 1–2 business days.

## Reach us
- Email: care@rarenaari.com
- Instagram: @rarenaari

For order issues, include your order number (it looks like RN-XXXXX).`,
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    body: `## Orders
### How do I track my order?
Log in and open My Account → Orders. Every status change is also emailed to you.

### Can I change my address after ordering?
Write to us within 12 hours of placing the order and we'll do our best.

## Shipping
### How long does delivery take?
Orders dispatch within 24–48 hours. Delivery usually takes 3–7 days depending on your pincode.

### Do you ship across India?
Yes — we deliver to all serviceable pincodes. Use the pincode checker on any product page.

## Returns
### What is your return policy?
7-day easy returns from the date of delivery. Items must be unworn with tags intact. See the [returns page](/returns) for details.

### When will I get my refund?
Refunds are initiated within 48 hours of the return passing quality check and reflect in 5–7 business days.

## Sizing
### How do I pick my size?
Every product page links to our [size guide](/size-guide). When in doubt between two sizes, we recommend sizing up for relaxed fits.`,
  },
  {
    slug: "shipping",
    title: "Shipping Policy",
    body: `## Dispatch
Orders are dispatched within 24–48 hours of payment confirmation (excluding Sundays and public holidays).

## Delivery time
- Metros: 2–4 business days
- Rest of India: 4–7 business days

## Shipping charges
Free shipping on orders above ₹999. Orders below that carry a flat ₹79 shipping fee.

## Tracking
You'll receive tracking details by email as soon as your order ships.`,
  },
  {
    slug: "returns",
    title: "Returns & Exchanges",
    body: `## 7-day easy returns
Request a return within 7 days of delivery. Items must be unworn, unwashed, with all tags intact.

## How it works
- Go to My Account → Orders and select the item
- We arrange a reverse pickup wherever available
- Refund is initiated within 48 hours of quality check

## Not returnable
- Items marked Final Sale
- Accessories and blouse pieces once cut or stitched

## Exchanges
Size exchanges are processed as a return + fresh order so your preferred size doesn't sell out while you wait.`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    body: `We collect only what we need to fulfil your orders and improve the store.

## What we collect
- Account details you provide (name, email, phone)
- Delivery addresses
- Order history and payment status (we never store card details — payments are processed by Razorpay)
- Anonymous usage analytics (device type, pages viewed)

## What we never do
- Sell your data
- Store payment credentials
- Track precise location

To delete your account and data, email care@rarenaari.com.`,
  },
  {
    slug: "terms",
    title: "Terms of Service",
    body: `By using this website you agree to these terms.

## Orders & pricing
All prices are in INR and inclusive of taxes. An order is confirmed only after successful payment verification. We reserve the right to cancel orders affected by pricing errors or stock issues — with a full refund.

## Intellectual property
All designs, photography and content on this site belong to Rare Naari and may not be reproduced without permission.

## Governing law
These terms are governed by the laws of India.`,
  },
  {
    slug: "size-guide",
    title: "Size Guide",
    body: `All measurements are body measurements in inches. Our garments include ease on top of these.

## Tops, kurtas & dresses
| Size | Bust | Waist | Hip |
| --- | --- | --- | --- |
| S | 34 | 28 | 37 |
| M | 36 | 30 | 39 |
| L | 38 | 32 | 41 |
| XL | 40 | 34 | 43 |

## Bottoms
| Size | Waist | Hip | Inseam |
| --- | --- | --- | --- |
| S | 28 | 37 | 28 |
| M | 30 | 39 | 28 |
| L | 32 | 41 | 28 |
| XL | 34 | 43 | 28 |

**Between sizes?** For relaxed fits, size down. For fitted styles, size up.`,
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log("Seeding Rare Naari…");

  // ---- admin
  const adminEmail = "admin@rarenaari.com";
  await db.adminUser.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Rare Naari Admin",
      passwordHash: await bcrypt.hash("RareNaari@2026", 10),
      role: "SUPER_ADMIN",
    },
    update: {},
  });
  console.log(`Admin: ${adminEmail} / RareNaari@2026`);

  // ---- categories
  const categoryDefs = [
    { name: "Kurta Sets", slug: "kurta-sets", tone: "terracotta", description: "Kurtas and kurta sets in breathable cottons, muslins and festive velvets." },
    { name: "Dresses", slug: "dresses", tone: "dusk", description: "Wrap dresses, maxis and midis that move with you." },
    { name: "Co-ord Sets", slug: "co-ord-sets", tone: "sage", description: "Matching sets you can wear together or split across the week." },
    { name: "Tops", slug: "tops", tone: "blush", description: "Everyday tops in muslin, rayon and cotton." },
    { name: "Bottoms", slug: "bottoms", tone: "mustard", description: "Palazzos and trousers with real pockets." },
    { name: "Sarees", slug: "sarees", tone: "indigo", description: "Handloom Banarasi silks and cloud-light organzas." },
  ] as const;

  const categories = new Map<string, string>();
  for (const [i, c] of categoryDefs.entries()) {
    const tone = TONES[c.tone];
    const image = await makeImage(`cat-${c.slug}`, {
      base: tone.base, accent: tone.accent, label: c.name, variant: i,
    });
    const row = await db.category.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug, description: c.description, image, sortOrder: i },
      update: { image, description: c.description },
    });
    categories.set(c.slug, row.id);
  }

  // ---- collections
  const collectionDefs = [
    { name: "Festive Edit", slug: "festive-edit", tone: "terracotta", description: "Zari, silk and velvet — pieces for the season of light." },
    { name: "Everyday Luxe", slug: "everyday-luxe", tone: "sage", description: "Elevated basics you'll reach for twice a week." },
  ] as const;
  const collections = new Map<string, string>();
  for (const [i, c] of collectionDefs.entries()) {
    const tone = TONES[c.tone];
    const image = await makeImage(`col-${c.slug}`, {
      base: tone.base, accent: tone.accent, label: c.name, variant: i + 1,
    });
    const row = await db.collection.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug, description: c.description, image, sortOrder: i },
      update: { image },
    });
    collections.set(c.slug, row.id);
  }

  // ---- products
  for (const [pi, p] of PRODUCTS.entries()) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) continue;

    const images: { url: string; alt: string; sortOrder: number; isPrimary: boolean }[] = [];
    for (const [ti, toneName] of p.tones.entries()) {
      const tone = TONES[toneName];
      for (let shot = 0; shot < 2; shot++) {
        const url = await makeImage(`${p.slug}-${toneName}-${shot + 1}`, {
          base: tone.base,
          accent: tone.accent,
          label: p.name,
          variant: ti * 2 + shot,
        });
        images.push({
          url,
          alt: `${p.name} in ${toneName} — view ${shot + 1}`,
          sortOrder: images.length,
          isPrimary: images.length === 0,
        });
      }
    }

    const product = await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        shortDescription: p.short,
        fabric: p.fabric,
        fit: p.fit,
        care: p.care,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - (PRODUCTS.length - pi) * 86_400_000),
        mrp: p.mrp * 100,
        sellingPrice: p.price * 100,
        lowStockThreshold: 5,
        tags: p.tags,
        categoryId: categories.get(p.category),
        featured: p.featured ?? false,
        bestSeller: p.bestSeller ?? false,
        newArrival: p.newArrival ?? false,
        onSale: p.onSale ?? false,
        seoTitle: `${p.name} | Rare Naari`,
        seoDescription: p.short,
        images: { create: images },
        collections: p.collections
          ? {
              create: p.collections
                .filter((slug) => collections.has(slug))
                .map((slug, i) => ({ collectionId: collections.get(slug)!, sortOrder: i })),
            }
          : undefined,
      },
    });

    const isSaree = p.category === "sarees";
    for (const toneName of p.tones) {
      const tone = TONES[toneName];
      const sizes = isSaree ? ["Free Size"] : SIZES;
      for (const [si, size] of sizes.entries()) {
        // varied but deterministic stock, with a few deliberate low/out states
        const stock =
          pi === 3 && size === "XL" ? 0 :
          pi === 0 && size === "L" ? 3 :
          pi === 7 && toneName === p.tones[1] ? 2 :
          6 + ((pi * 7 + si * 3 + toneName.length) % 14);
        await db.productVariant.create({
          data: {
            productId: product.id,
            sku: `${p.sku}-${toneName.toUpperCase()}-${size.replace(/\s/g, "").toUpperCase()}`,
            size,
            color: toneName,
            colorHex: tone.hex,
            stock,
          },
        });
      }
    }
    console.log(`Product: ${p.name}`);
  }

  // ---- homepage sections
  const sectionCount = await db.homepageSection.count();
  if (sectionCount === 0) {
    const heroImage = await makeWide("hero-main", {
      base: TONES.terracotta.base, accent: TONES.blush.accent, label: "New Season", variant: 0,
    });
    const bannerImage = await makeWide("banner-festive", {
      base: TONES.dusk.base, accent: TONES.terracotta.accent, label: "Festive Edit", variant: 1,
    });
    await db.homepageSection.createMany({
      data: [
        {
          type: "HERO", sortOrder: 0, published: true,
          config: {
            image: heroImage,
            headline: "Clothing for the rare ones",
            subheading: "Breathable fabrics, honest prices, small batches. New season is here.",
            ctaText: "Shop new arrivals",
            ctaLink: "/new-arrivals",
          },
        },
        {
          type: "CATEGORY_GRID", sortOrder: 1, published: true,
          title: "Shop by category",
          config: {},
        },
        {
          type: "PRODUCT_GRID", sortOrder: 2, published: true,
          title: "New arrivals", subtitle: "Fresh from the studio",
          config: { source: "new-arrivals", count: 8 },
        },
        {
          type: "COLLECTION_BANNER", sortOrder: 3, published: true,
          title: "The Festive Edit", subtitle: "Zari, silk and velvet for the season of light",
          config: { image: bannerImage, collectionSlug: "festive-edit", ctaText: "Explore the edit" },
        },
        {
          type: "PRODUCT_GRID", sortOrder: 4, published: true,
          title: "Best sellers", subtitle: "Loved, reviewed, restocked",
          config: { source: "best-sellers", count: 4 },
        },
        {
          type: "BRAND_STORY", sortOrder: 5, published: true,
          title: "Made for the rare ones",
          config: {
            text: "Every Rare Naari piece is designed in-house and made in small batches with fabrics we'd wear ourselves — breathable cottons, handloom silks and honest linen. When a piece is gone, it's usually gone.",
            ctaText: "Our story",
            ctaLink: "/about",
          },
        },
        {
          type: "FAQ_PREVIEW", sortOrder: 6, published: true,
          title: "Questions, answered",
          config: {
            faqs: [
              { q: "How long does delivery take?", a: "Orders dispatch within 24–48 hours and usually reach you in 3–7 days depending on your pincode." },
              { q: "What is the return policy?", a: "7-day easy returns from delivery. Items must be unworn with tags intact." },
              { q: "Do you ship across India?", a: "Yes — check your pincode on any product page for serviceability." },
              { q: "How do I pick my size?", a: "Every product page links to our size guide. Between sizes? Size up for relaxed fits." },
            ],
          },
        },
      ],
    });
    console.log("Homepage sections created");
  }

  // ---- content pages
  for (const page of CONTENT_PAGES) {
    await db.contentPage.upsert({
      where: { slug: page.slug },
      create: { slug: page.slug, title: page.title, body: page.body, seoTitle: `${page.title} | Rare Naari` },
      update: {},
    });
  }

  // ---- welcome coupon
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      minCartValue: 149900,
      maxDiscount: 50000,
      perUserLimit: 1,
      active: true,
    },
    update: {},
  });

  console.log("Seed complete ✓");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
