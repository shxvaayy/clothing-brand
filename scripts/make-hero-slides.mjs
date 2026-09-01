// Couture-style hero canvases: arch-framed photo (right) + layered brand
// backdrop (left) with arcs, sparkles and a medallion detail shot.
// Sources from /tmp/px/<id>.jpg. Run: node scripts/make-hero-slides.mjs
import sharp from "sharp";

const W = 2400;
const H = 1100;

// arch geometry — aspect ≈ 2:3 so portrait photos need almost no cropping
const M = 56; // top/bottom margin
const AH = H - M * 2; // arch height 988
const AW = Math.round(AH * 0.68); // ≈ 672
const AX = W - AW - 170; // arch left x
const AY = M;
const AR = AW / 2; // arch top radius

// medallion detail shot
const MD = 300; // diameter
const MX = AX - MD / 2 - 30; // left x
const MY = H - MD - 96; // top y

const archPath = (x, y, w, h, r) =>
  `M ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} Z`;

function sparkle(x, y, s, color, o) {
  return `<path d="M ${x} ${y - s} Q ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z" fill="${color}" opacity="${o}"/>`;
}

function bgSvg(c1, c2, accent) {
  const cx = AX + AW / 2;
  const cy = AY + AH / 2;
  const sparkles = [
    [W * 0.07, H * 0.2, 11, 0.35], [W * 0.14, H * 0.66, 8, 0.22],
    [W * 0.23, H * 0.12, 7, 0.28], [W * 0.3, H * 0.82, 12, 0.3],
    [W * 0.38, H * 0.3, 6, 0.2], [W * 0.05, H * 0.88, 7, 0.18],
    [W * 0.45, H * 0.72, 9, 0.25], [W * 0.5, H * 0.14, 8, 0.22],
    [W * 0.19, H * 0.42, 5, 0.16], [W * 0.41, H * 0.5, 5, 0.15],
  ].map(([x, y, s, o]) => sparkle(x, y, s, accent, o)).join("");

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0.3">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="72%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="vig" cx="0.32" cy="0.4" r="1.1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.06"/>
      <stop offset="55%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.22"/>
    </radialGradient>
    <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.2" fill="${accent}" opacity="0.07"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>

  <!-- oversized ghost lotus line-art, brand motif -->
  <g transform="translate(${W * 0.16}, ${H * 0.78}) scale(1.15)" stroke="${accent}" fill="none" stroke-width="2" opacity="0.13">
    <ellipse cx="0" cy="-170" rx="52" ry="170" transform="rotate(0)"/>
    <ellipse cx="0" cy="-160" rx="48" ry="160" transform="rotate(28)"/>
    <ellipse cx="0" cy="-160" rx="48" ry="160" transform="rotate(-28)"/>
    <ellipse cx="0" cy="-140" rx="44" ry="140" transform="rotate(56)"/>
    <ellipse cx="0" cy="-140" rx="44" ry="140" transform="rotate(-56)"/>
  </g>

  <!-- concentric arcs radiating from the arch -->
  <circle cx="${cx}" cy="${cy}" r="${AH * 0.72}" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.22"/>
  <circle cx="${cx}" cy="${cy}" r="${AH * 0.82}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.14"/>
  <circle cx="${cx}" cy="${cy}" r="${AH * 0.94}" fill="none" stroke="${accent}" stroke-width="1" opacity="0.08" stroke-dasharray="2 10"/>

  ${sparkles}

  <!-- echo arches behind the photo -->
  <path d="${archPath(AX - 34, AY - 26, AW, AH + 26, AR)}" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.55"/>
  <path d="${archPath(AX - 64, AY - 48, AW, AH + 48, AR)}" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.25"/>
  <!-- soft glow behind arch -->
  <path d="${archPath(AX - 10, AY - 8, AW + 20, AH + 8, AR + 10)}" fill="${accent}" opacity="0.10"/>

  <!-- baseline the arch stands on -->
  <line x1="${W * 0.55}" y1="${H - M}" x2="${W - 100}" y2="${H - M}" stroke="${accent}" stroke-width="1.5" opacity="0.35"/>

  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`);
}

const overlaySvg = (accent) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <!-- crisp border on the photo arch -->
  <path d="${archPath(AX, AY, AW, AH, AR)}" fill="none" stroke="#f8efe4" stroke-width="4" opacity="0.95"/>
  <!-- medallion rings -->
  <circle cx="${MX + MD / 2}" cy="${MY + MD / 2}" r="${MD / 2 + 5}" fill="none" stroke="#f8efe4" stroke-width="6"/>
  <circle cx="${MX + MD / 2}" cy="${MY + MD / 2}" r="${MD / 2 + 16}" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.7"/>
</svg>`);

async function archPhoto(id) {
  const mask = Buffer.from(
    `<svg width="${AW}" height="${AH}"><path d="${archPath(0, 0, AW, AH, AR)}" fill="#fff"/></svg>`
  );
  return sharp(`/tmp/px/${id}.jpg`)
    .resize(AW, AH, { fit: "cover", position: "attention" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function circlePhoto(id) {
  const mask = Buffer.from(
    `<svg width="${MD}" height="${MD}"><circle cx="${MD / 2}" cy="${MD / 2}" r="${MD / 2}" fill="#fff"/></svg>`
  );
  return sharp(`/tmp/px/${id}.jpg`)
    .resize(MD, MD, { fit: "cover", position: "attention" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

const SLIDES = [
  { n: 1, main: 28943474, detail: 37880205, c1: "#5f2d1e", c2: "#b06a4d", accent: "#f3e2d9" },
  { n: 2, main: 37054322, detail: 33276621, c1: "#33273a", c2: "#7c5a6e", accent: "#e8cf9f" },
  { n: 3, main: 12572689, detail: 36679410, c1: "#3f4a36", c2: "#87977a", accent: "#eef2e0" },
];

for (const s of SLIDES) {
  const [photo, detail] = await Promise.all([archPhoto(s.main), circlePhoto(s.detail)]);
  await sharp(bgSvg(s.c1, s.c2, s.accent))
    .composite([
      { input: photo, left: AX, top: AY },
      { input: detail, left: MX, top: MY },
      { input: overlaySvg(s.accent), left: 0, top: 0 },
    ])
    .jpeg({ quality: 88 })
    .toFile(`public/uploads/seed/hero-slide-${s.n}.jpg`);
  console.log("slide", s.n);
}
console.log("done");
