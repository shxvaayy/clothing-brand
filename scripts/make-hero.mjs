// Regenerates the hero + festive banner artwork using the real brand logo
// as a centred medallion (placeholder until campaign photography arrives).
// Run: node scripts/make-hero.mjs
import sharp from "sharp";
import path from "path";

const OUT = path.join(process.cwd(), "public", "uploads", "seed");
const LOGO = path.join(process.cwd(), "public", "brand", "logo.png");

function arch(cx, bottomY, width, height, color, opacity, sw) {
  const x0 = cx - width / 2;
  const x1 = cx + width / 2;
  const topY = bottomY - height;
  const r = width / 2;
  return `<path d="M ${x0} ${bottomY} L ${x0} ${topY + r} A ${r} ${r} 0 0 1 ${x1} ${topY + r} L ${x1} ${bottomY}"
    fill="none" stroke="${color}" stroke-width="${sw}" opacity="${opacity}"/>`;
}

function heroBg(w, h, medallionCx, medallionCy, medallionR) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#7d3f2e"/>
      <stop offset="48%" stop-color="#a85b44"/>
      <stop offset="100%" stop-color="#cf9877"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.5" cy="0.45" r="0.85">
      <stop offset="0%" stop-color="#f3e2d9" stop-opacity="0.10"/>
      <stop offset="60%" stop-color="#f3e2d9" stop-opacity="0"/>
      <stop offset="100%" stop-color="#33170f" stop-opacity="0.34"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>

  <!-- soft ambience -->
  <circle cx="${w * 0.1}" cy="${h * 0.15}" r="${h * 0.32}" fill="#f3e2d9" opacity="0.05"/>
  <circle cx="${w * 0.9}" cy="${h * 0.8}" r="${h * 0.4}" fill="#4a2820" opacity="0.14"/>

  <!-- temple arches framing the medallion -->
  ${arch(w / 2, h * 1.04, h * 1.06, h * 0.94, "#f8efe4", 0.34, 3.5)}
  ${arch(w / 2, h * 1.04, h * 0.92, h * 0.82, "#f8efe4", 0.18, 2.5)}
  ${arch(w * 0.05, h * 1.08, h * 0.52, h * 0.46, "#f8efe4", 0.1, 2)}
  ${arch(w * 0.95, h * 1.08, h * 0.52, h * 0.46, "#f8efe4", 0.1, 2)}

  <!-- rings behind the logo medallion -->
  <circle cx="${medallionCx}" cy="${medallionCy}" r="${medallionR * 1.22}" fill="none" stroke="#f8efe4" stroke-width="2" opacity="0.4"/>
  <circle cx="${medallionCx}" cy="${medallionCy}" r="${medallionR * 1.36}" fill="none" stroke="#f8efe4" stroke-width="1.5" opacity="0.18"/>
  <circle cx="${medallionCx}" cy="${medallionCy}" r="${medallionR * 1.05}" fill="#f8efe4" opacity="0.10"/>

  <!-- tiny accents -->
  <circle cx="${medallionCx - medallionR * 1.7}" cy="${medallionCy}" r="4" fill="#f8efe4" opacity="0.5"/>
  <circle cx="${medallionCx + medallionR * 1.7}" cy="${medallionCy}" r="4" fill="#f8efe4" opacity="0.5"/>

  <rect width="${w}" height="${h}" fill="url(#vig)"/>
</svg>`;
}

async function makeHero() {
  const w = 2000;
  const h = 1250;
  const medallionR = Math.round(h * 0.19);
  const cx = w / 2;
  const cy = Math.round(h * 0.38);

  // circular-crop the logo so the medallion is a clean disc
  const size = medallionR * 2;
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  const logoDisc = await sharp(LOGO)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  await sharp(Buffer.from(heroBg(w, h, cx, cy, medallionR)))
    .composite([{ input: logoDisc, left: cx - medallionR, top: cy - medallionR }])
    .jpeg({ quality: 88 })
    .toFile(path.join(OUT, "hero-main.jpg"));
}

function bannerSvg(w, h) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0%" stop-color="#3f3242"/>
      <stop offset="55%" stop-color="#5c4a5e"/>
      <stop offset="100%" stop-color="#8a6a52"/>
    </linearGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.8">
      <stop offset="0%" stop-color="#f0dcc3" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#221a24" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg2)"/>
  <circle cx="${w * 0.85}" cy="${h * 0.1}" r="${h * 0.5}" fill="#d4ab5e" opacity="0.1"/>
  <circle cx="${w * 0.1}" cy="${h * 0.95}" r="${h * 0.55}" fill="#221a24" opacity="0.18"/>
  ${arch(w * 0.12, h * 1.15, h * 0.9, h * 0.85, "#e8cf9f", 0.28, 2.5)}
  ${arch(w * 0.12, h * 1.15, h * 0.74, h * 0.7, "#e8cf9f", 0.16, 2)}
  ${arch(w * 0.88, h * 1.15, h * 0.9, h * 0.85, "#e8cf9f", 0.28, 2.5)}
  ${arch(w * 0.88, h * 1.15, h * 0.74, h * 0.7, "#e8cf9f", 0.16, 2)}
  <rect width="${w}" height="${h}" fill="url(#glow2)"/>
</svg>`;
}

await makeHero();
await sharp(Buffer.from(bannerSvg(1800, 750)))
  .jpeg({ quality: 86 })
  .toFile(path.join(OUT, "banner-festive.jpg"));
console.log("hero-main.jpg + banner-festive.jpg regenerated with brand medallion");
