// Replaces the generated placeholder artwork with real free-stock photos
// (Pexels license — free for commercial use, no attribution required).
// Source files are expected in /tmp/px/<id>.jpg. Output overwrites the
// seed image files, so no DB changes are needed.
// Run: node scripts/apply-real-images.mjs
import sharp from "sharp";
import path from "path";
import fs from "fs";

const SRC = "/tmp/px";
const OUT = path.join(process.cwd(), "public", "uploads", "seed");

const PRODUCTS = {
  "lotus-bloom-kurta-set": { terracotta: 4584566, ivory: 8771006 },
  "meera-chikankari-kurta": { ivory: 35504999, blush: 35504991 },
  "wildflower-wrap-dress": { sage: 12572689, dusk: 13430754 },
  "dusk-maxi-dress": { dusk: 944763, black: 33276621 },
  "sage-everyday-co-ord": { sage: 6181955, ivory: 36679410 },
  "terra-linen-co-ord": { terracotta: 28213774, black: 28213745 },
  "ivory-muslin-top": { ivory: 7406137, blush: 32244572 },
  "blush-peplum-top": { blush: 19621740, mustard: 35304403 },
  "flared-palazzo-pants": { black: 12279088, indigo: 35445207 },
  "straight-fit-cotton-trousers": { mustard: 34351520, ivory: 2723623 },
  "banarasi-silk-saree": { terracotta: 37880205, indigo: 37054322 },
  "pastel-organza-saree": { blush: 29026116, sage: 35390253 },
  "noor-velvet-kurta-set": { dusk: 17113983, terracotta: 28316406 },
};

const CATEGORIES = {
  "kurta-sets": 8771006,
  dresses: 12572689,
  "co-ord-sets": 6181955,
  tops: 19621740,
  bottoms: 12279088,
  sarees: 27918896,
};

const COLLECTIONS = {
  "festive-edit": 37880205,
  "everyday-luxe": 36679410,
};

const HERO = 28943474;
const BANNER = 33276621;

const src = (id) => path.join(SRC, `${id}.jpg`);

async function productShots(slug, tone, id) {
  // view 1: full frame
  await sharp(src(id))
    .resize(900, 1200, { fit: "cover" })
    .jpeg({ quality: 84 })
    .toFile(path.join(OUT, `${slug}-${tone}-1.jpg`));
  // view 2: tighter crop for the hover state
  await sharp(src(id))
    .resize(1300, 1733, { fit: "cover" })
    .extract({ left: 200, top: 150, width: 900, height: 1200 })
    .jpeg({ quality: 84 })
    .toFile(path.join(OUT, `${slug}-${tone}-2.jpg`));
}

for (const [slug, tones] of Object.entries(PRODUCTS)) {
  for (const [tone, id] of Object.entries(tones)) {
    if (!fs.existsSync(src(id))) {
      console.error(`missing /tmp/px/${id}.jpg for ${slug}/${tone}`);
      continue;
    }
    await productShots(slug, tone, id);
  }
  console.log(`product: ${slug}`);
}

for (const [slug, id] of Object.entries(CATEGORIES)) {
  await sharp(src(id)).resize(900, 900, { fit: "cover" }).jpeg({ quality: 84 })
    .toFile(path.join(OUT, `cat-${slug}.jpg`));
}
console.log("categories done");

for (const [slug, id] of Object.entries(COLLECTIONS)) {
  await sharp(src(id)).resize(1400, 1050, { fit: "cover" }).jpeg({ quality: 84 })
    .toFile(path.join(OUT, `col-${slug}.jpg`));
}
console.log("collections done");

await sharp(src(HERO)).resize(2000, 1250, { fit: "cover" }).jpeg({ quality: 86 })
  .toFile(path.join(OUT, "hero-main.jpg"));
await sharp(src(BANNER)).resize(1800, 750, { fit: "cover" }).jpeg({ quality: 86 })
  .toFile(path.join(OUT, "banner-festive.jpg"));
console.log("hero + banner done");
