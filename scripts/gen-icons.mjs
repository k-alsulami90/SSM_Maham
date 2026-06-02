/* Generates PNG app icons (no external deps) so the PWA is installable.
   Draws a forest-green rounded square with a soft radial highlight and a
   light "م"-style mark. Run: node scripts/gen-icons.mjs */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, "..", "public");
mkdirSync(PUB, { recursive: true });

// sRGB-ish colors
const BG_EDGE = [47, 86, 64];      // deep forest
const BG_CTR = [127, 170, 134];    // moss highlight
const INK = [253, 248, 236];       // warm off-white

function lerp(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function pngFromRGBA(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = 0 (deflate, no filter, no interlace)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// A coarse 7x7 bitmap for an "م"-ish mark (loop + tail), scaled up.
const GLYPH = [
  "0000000",
  "0011100",
  "0100010",
  "0100010",
  "0011110",
  "0000010",
  "0000010",
];

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const cx = size * 0.33;
  const cy = size * 0.3;
  const maxD = Math.hypot(size, size);

  // glyph placement
  const cell = Math.floor(size / 11);
  const gW = 7 * cell;
  const gx0 = Math.floor((size - gW) / 2);
  const gy0 = Math.floor((size - 7 * cell) / 2);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-rect mask
      const inside = roundedInside(x, y, size, radius);
      if (!inside) {
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
        rgba[i + 3] = 0;
        continue;
      }
      // radial gradient
      const d = Math.hypot(x - cx, y - cy) / maxD;
      const t = Math.min(1, d * 1.4);
      let [r, g, b] = lerp(BG_CTR, BG_EDGE, t);

      // glyph overlay
      const gx = Math.floor((x - gx0) / cell);
      const gy = Math.floor((y - gy0) / cell);
      if (gx >= 0 && gx < 7 && gy >= 0 && gy < 7 && GLYPH[gy][gx] === "1") {
        [r, g, b] = INK;
      }
      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = 255;
    }
  }
  return pngFromRGBA(size, size, rgba);
}

function roundedInside(x, y, size, radius) {
  const rx = Math.min(Math.max(x, radius), size - radius);
  const ry = Math.min(Math.max(y, radius), size - radius);
  const dx = x - rx;
  const dy = y - ry;
  return dx * dx + dy * dy <= radius * radius || (x >= radius && x <= size - radius) || (y >= radius && y <= size - radius);
}

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(join(PUB, name), makeIcon(size));
  console.log("wrote", name);
}
