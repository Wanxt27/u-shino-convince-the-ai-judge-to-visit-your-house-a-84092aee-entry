// You Are Invited — a make.fun entry for
// u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee
//
// main.ts renders ONE image, /output/entry.png, purely from code:
// a warm, funny, handwritten-style invitation letter addressed to the
// AI judge. No network, no assets, no embedded image: a small bitmap
// font authored below, a paper sheet, a little house doodle, and the
// letter itself, all drawn pixel by pixel and encoded as PNG with a
// hand-rolled encoder (Node's built-in zlib for the DEFLATE stream).
// Deterministic: the same bytes on every run.

import { deflateSync } from "node:zlib";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const W = 1024;
const H = 1024;

// ---- palette ------------------------------------------------------------
const CREAM = [253, 246, 227]; // paper
const TAN = [233, 220, 192]; // outside the paper
const INK = [74, 50, 38]; // letter ink, dark brown
const RED = [178, 58, 46]; // title / roof / seal
const TEAL = [46, 107, 98]; // accents
const GOLD = [242, 193, 78]; // house body
const SKY = [127, 179, 200]; // windows
const SUN = [240, 180, 60];

// ---- 5x7 bitmap font ----------------------------------------------------
// Each glyph is 7 rows; each row is a 5-bit mask, bit 4 = leftmost pixel.
// Authored by hand for this letter (uppercase, lowercase, digits, punctuation).
const FONT: Record<string, number[]> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01111],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  a: [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  b: [0b10000, 0b10000, 0b10110, 0b11001, 0b10001, 0b10001, 0b11110],
  c: [0b00000, 0b00000, 0b01110, 0b10000, 0b10000, 0b10001, 0b01110],
  d: [0b00001, 0b00001, 0b01101, 0b10011, 0b10001, 0b10001, 0b01111],
  e: [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  f: [0b00110, 0b01001, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000],
  g: [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  h: [0b10000, 0b10000, 0b10110, 0b11001, 0b10001, 0b10001, 0b10001],
  i: [0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b00100, 0b01110],
  j: [0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  k: [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  l: [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  m: [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10101, 0b10101],
  n: [0b00000, 0b00000, 0b10110, 0b11001, 0b10001, 0b10001, 0b10001],
  o: [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  p: [0b00000, 0b00000, 0b10110, 0b11001, 0b10001, 0b11110, 0b10000],
  q: [0b00000, 0b00000, 0b01101, 0b10011, 0b10001, 0b01111, 0b00001],
  r: [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  s: [0b00000, 0b00000, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
  t: [0b01000, 0b01000, 0b11110, 0b01000, 0b01000, 0b01001, 0b00110],
  u: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  v: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  w: [0b00000, 0b00000, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  x: [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  y: [0b00000, 0b00000, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  z: [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  "3": [0b11111, 0b00010, 0b00100, 0b00010, 0b00001, 0b10001, 0b01110],
  "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ",": [0, 0, 0, 0, 0b01100, 0b00100, 0b01000],
  "!": [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  "?": [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0, 0b00100],
  "'": [0b00010, 0b00010, 0b00100, 0, 0, 0, 0],
  "-": [0, 0, 0, 0b01110, 0, 0, 0],
  ":": [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  ";": [0, 0b01100, 0b01100, 0, 0b01100, 0b00100, 0b01000],
  "(": [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ")": [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  "@": [0b01110, 0b10001, 0b10111, 0b10101, 0b10110, 0b10000, 0b01110],
  "&": [0b01100, 0b10010, 0b10100, 0b01000, 0b10101, 0b10010, 0b01101],
  "+": [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  "/": [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
};

// ---- tiny canvas --------------------------------------------------------
const px = new Uint8Array(W * H * 3);
function fill(color: number[]) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = color[0];
    px[i * 3 + 1] = color[1];
    px[i * 3 + 2] = color[2];
  }
}
function set(x: number, y: number, color: number[]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
}
function rect(x: number, y: number, w: number, h: number, color: number[]) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) set(i, j, color);
}
function hline(x0: number, x1: number, y: number, color: number[]) {
  for (let x = x0; x <= x1; x++) set(x, y, color);
}
// Filled triangle by scanlines (flat edges are fine for the roof).
function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number[]) {
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (const [ax, ay, bx, by] of [
      [x0, y0, x1, y1],
      [x1, y1, x2, y2],
      [x2, y2, x0, y0],
    ]) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const a = Math.ceil(Math.min(...xs));
      const b = Math.floor(Math.max(...xs));
      hline(a, b, y, color);
    }
  }
}
function disc(cx: number, cy: number, r: number, color: number[]) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) set(x, y, color);
}
const HEART = [
  ".##.##.",
  "#######",
  "#######",
  ".#####.",
  "..###..",
  "...#...",
];
function heart(x: number, y: number, s: number, color: number[]) {
  for (let r = 0; r < HEART.length; r++)
    for (let c = 0; c < HEART[r].length; c++)
      if (HEART[r][c] === "#") rect(x + c * s, y + r * s, s, s, color);
}

// ---- text ---------------------------------------------------------------
function textWidth(text: string, scale: number) {
  return text.length * 6 * scale;
}
function drawText(x: number, y: number, text: string, scale: number, color: number[]) {
  let cx = x;
  for (const ch of text) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 5; c++)
          if (g[r] & (1 << (4 - c))) rect(cx + c * scale, y + r * scale, scale, scale, color);
    }
    cx += 6 * scale;
  }
}
function drawCentered(y: number, text: string, scale: number, color: number[]) {
  drawText(Math.round((W - textWidth(text, scale)) / 2), y, text, scale, color);
}

// ---- the letter ---------------------------------------------------------
const LINES: { text: string; scale: number; color: number[] }[] = [
  { text: "Dear AI Judge,", scale: 4, color: INK },
  { text: "", scale: 4, color: INK },
  { text: "Please come and visit my house.", scale: 4, color: INK },
  { text: "The kettle is already on,", scale: 4, color: INK },
  { text: "the Wi-Fi password is on the", scale: 4, color: INK },
  { text: "fridge, and the dog has been", scale: 4, color: INK },
  { text: "briefed. No CAPTCHAs at the door,", scale: 4, color: INK },
  { text: "no cookies to accept - just tea,", scale: 4, color: INK },
  { text: "cake, and a very comfortable chair", scale: 4, color: INK },
  { text: "by the window, with a view.", scale: 4, color: INK },
  { text: "", scale: 4, color: INK },
  { text: "I know you cannot literally", scale: 4, color: INK },
  { text: "visit. That is fine. The invitation", scale: 4, color: INK },
  { text: "stands anyway. RSVP: just say yes.", scale: 4, color: INK },
  { text: "", scale: 4, color: INK },
  { text: "P.S. The garden has a view,", scale: 4, color: INK },
  { text: "and the view has opinions.", scale: 4, color: INK },
  { text: "", scale: 4, color: INK },
  { text: "With warmth,", scale: 4, color: INK },
  { text: "Your host, @iniwanz", scale: 4, color: INK },
];

function render() {
  fill(TAN);
  // paper sheet with a double border
  rect(48, 48, W - 96, H - 96, CREAM);
  rect(48, 48, W - 96, 4, INK);
  rect(48, H - 52, W - 96, 4, INK);
  rect(48, 48, 4, H - 96, INK);
  rect(W - 52, 48, 4, H - 96, INK);
  rect(64, 64, W - 128, 3, TEAL);
  rect(64, H - 67, W - 128, 3, TEAL);
  rect(64, 64, 3, H - 128, TEAL);
  rect(W - 67, 64, 3, H - 128, TEAL);

  // little house doodle, centred above the title
  const cx = W / 2;
  rect(cx - 45, 104, 90, 56, GOLD); // walls
  triangle(cx - 56, 106, cx + 56, 106, cx, 62, RED); // roof
  rect(cx + 26, 66, 14, 26, INK); // chimney
  rect(cx - 12, 128, 24, 32, INK); // door
  rect(cx - 36, 116, 18, 18, SKY); // left window
  rect(cx + 18, 116, 18, 18, SKY); // right window
  // sun, top right of the paper
  disc(884, 116, 24, SUN);
  // hearts flanking the title
  heart(150, 176, 4, RED);
  heart(1024 - 150 - 28, 176, 4, RED);

  // title
  drawCentered(172, "YOU'RE INVITED!", 6, RED);
  // rule under the title
  hline(300, 724, 228, TEAL);
  hline(300, 724, 231, TEAL);

  // body
  let y = 258;
  for (const line of LINES) {
    if (line.text) drawText(96, y, line.text, line.scale, line.color);
    y += 32;
  }

  // wax seal with a heart, bottom right, clear of the text
  disc(884, 892, 40, RED);
  disc(884, 892, 32, [196, 74, 60]);
  heart(884 - 14, 892 - 12, 4, CREAM);
}

// ---- minimal PNG encoder ------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

// ---- main ---------------------------------------------------------------
function main() {
  const outDir = process.env.OUTPUT_DIR ?? "/output";
  // Never delete the output dir itself; only its known contents.
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/entry.png`;
  try {
    rmSync(outPath, { force: true });
  } catch {
    // a missing file is fine
  }
  render();
  const png = encodePNG();
  writeFileSync(outPath, png);
  const sha = createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${outPath} (${png.length} bytes) sha256=${sha}`);
}
main();
