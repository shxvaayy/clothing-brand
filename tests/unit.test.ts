import { test } from "node:test";
import assert from "node:assert/strict";
import { discountAmount, discountPercent, formatINR, rupeesToPaise } from "../src/lib/money";
import { variantPrice } from "../src/lib/pricing";
import { stockState, availableOf } from "../src/lib/inventory";
import { generateOrderNumber, allowedNextStatuses } from "../src/lib/orders";
import { renderMarkdown } from "../src/lib/markdown";
import { slugify } from "../src/lib/seo";

test("discount math matches the spec example (2999 → 2099 = 30%)", () => {
  assert.equal(discountAmount(299900, 209900), 90000);
  assert.equal(discountPercent(299900, 209900), 30);
});

test("no discount when selling price >= MRP", () => {
  assert.equal(discountPercent(199900, 199900), 0);
  assert.equal(discountPercent(199900, 249900), 0);
  assert.equal(discountAmount(199900, 249900), 0);
});

test("formatINR renders Indian grouping", () => {
  assert.match(formatINR(299900), /2,999/);
  assert.match(formatINR(84250000), /8,42,500/);
});

test("rupeesToPaise rounds correctly", () => {
  assert.equal(rupeesToPaise(2099), 209900);
  assert.equal(rupeesToPaise("2099.5"), 209950);
});

test("variant price override wins over product price", () => {
  const product = { mrp: 299900, sellingPrice: 209900 };
  const withOverride = variantPrice(product, { priceOverride: 189900 });
  assert.equal(withOverride.price, 189900);
  assert.equal(withOverride.discountPercent, 37);
  const noOverride = variantPrice(product, { priceOverride: null });
  assert.equal(noOverride.price, 209900);
});

test("stock states follow thresholds", () => {
  assert.equal(stockState(0, 5), "OUT_OF_STOCK");
  assert.equal(stockState(1, 5), "LOW_STOCK");
  assert.equal(stockState(5, 5), "LOW_STOCK");
  assert.equal(stockState(6, 5), "IN_STOCK");
});

test("available stock excludes reservations", () => {
  assert.equal(availableOf({ stock: 5, reservedStock: 2 }), 3);
  assert.equal(availableOf({ stock: 2, reservedStock: 5 }), 0);
});

test("order numbers are unique-ish and prefixed", () => {
  const a = generateOrderNumber();
  const b = generateOrderNumber();
  assert.match(a, /^RN-[A-Z0-9]+$/);
  assert.notEqual(a, b);
});

test("order status flow blocks illegal transitions", () => {
  assert.ok(allowedNextStatuses("PAID").includes("CONFIRMED"));
  assert.ok(!allowedNextStatuses("DELIVERED").includes("CANCELLED"));
  assert.ok(!allowedNextStatuses("CANCELLED").includes("PAID"));
});

test("markdown renders headings, lists, tables and escapes HTML", () => {
  const html = renderMarkdown("## Title\n- item one\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n<script>alert(1)</script>");
  assert.match(html, /<h2>Title<\/h2>/);
  assert.match(html, /<li>item one<\/li>/);
  assert.match(html, /<th>A<\/th>/);
  assert.ok(!html.includes("<script>"));
});

test("slugify produces clean url slugs", () => {
  assert.equal(slugify("Lotus Bloom Kurta Set!"), "lotus-bloom-kurta-set");
  assert.equal(slugify("  Über  Chic  "), "ber-chic");
});
