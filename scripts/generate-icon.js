'use strict';
// Generates assets/icon.png — COGS green orb with amber HUD brackets on void background.
// Run: node scripts/generate-icon.js
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZE = 1024;

// Colors
const BG = { r: 2, g: 5, b: 12, a: 255 };         // #02050C void
const GREEN = { r: 74, g: 222, b: 128, a: 255 };   // #4ADE80 COGS green
const AMBER = { r: 240, g: 180, b: 41, a: 255 };   // #F0B429

const png = new PNG({ width: SIZE, height: SIZE, filterType: -1 });

function setPixel(x, y, c) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const idx = (y * SIZE + x) * 4;
  png.data[idx]     = c.r;
  png.data[idx + 1] = c.g;
  png.data[idx + 2] = c.b;
  png.data[idx + 3] = c.a;
}

function blendPixel(x, y, c, alpha) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const idx = (y * SIZE + x) * 4;
  const a = alpha / 255;
  png.data[idx]     = Math.round(png.data[idx]     * (1 - a) + c.r * a);
  png.data[idx + 1] = Math.round(png.data[idx + 1] * (1 - a) + c.g * a);
  png.data[idx + 2] = Math.round(png.data[idx + 2] * (1 - a) + c.b * a);
  png.data[idx + 3] = 255;
}

// Fill background
for (let i = 0; i < SIZE * SIZE * 4; i += 4) {
  png.data[i]     = BG.r;
  png.data[i + 1] = BG.g;
  png.data[i + 2] = BG.b;
  png.data[i + 3] = BG.a;
}

const cx = SIZE / 2;
const cy = SIZE / 2;
const orbR = 280;
const glowR = orbR + 100;

// Draw glow halo (radial falloff outward from orb edge)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist >= orbR && dist <= glowR) {
      const t = 1 - (dist - orbR) / (glowR - orbR);
      const alpha = Math.round(t * t * 120);
      blendPixel(x, y, GREEN, alpha);
    }
  }
}

// Draw inner soft glow (inside orb, brighter at center)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist < orbR) {
      const t = 1 - dist / orbR;
      // Core: bright green fill
      const alpha = Math.round(180 + t * 75);
      blendPixel(x, y, GREEN, Math.min(255, alpha));
    }
  }
}

// Crisp orb edge (anti-aliased circle border)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const edgeDist = Math.abs(dist - orbR);
    if (edgeDist < 1.5) {
      const alpha = Math.round((1 - edgeDist / 1.5) * 255);
      blendPixel(x, y, { r: 255, g: 255, b: 255, a: 255 }, alpha * 0.4);
    }
  }
}

// Specular highlight (top-left quadrant)
const specCx = cx - orbR * 0.3;
const specCy = cy - orbR * 0.3;
const specR = orbR * 0.4;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dist = Math.sqrt((x - specCx) ** 2 + (y - specCy) ** 2);
    // Only inside the orb
    const orbDist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist < specR && orbDist < orbR) {
      const t = 1 - dist / specR;
      const alpha = Math.round(t * t * 55);
      blendPixel(x, y, { r: 255, g: 255, b: 255, a: 255 }, alpha);
    }
  }
}

// ── Amber HUD bracket corners ─────────────────────────────────────────────────
// Each corner has an L-shaped bracket. Inset from edge, with thick lines.
const MARGIN = 80;     // inset from canvas edge
const LEG = 140;       // arm length of each bracket leg
const THICKNESS = 14;  // stroke width

function drawRect(x1, y1, w, h, c) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(x1 + dx, y1 + dy, c);
    }
  }
}

// Top-left bracket
drawRect(MARGIN, MARGIN, LEG, THICKNESS, AMBER);                     // horizontal arm
drawRect(MARGIN, MARGIN, THICKNESS, LEG, AMBER);                     // vertical arm

// Top-right bracket
drawRect(SIZE - MARGIN - LEG, MARGIN, LEG, THICKNESS, AMBER);        // horizontal arm
drawRect(SIZE - MARGIN - THICKNESS, MARGIN, THICKNESS, LEG, AMBER);  // vertical arm

// Bottom-left bracket
drawRect(MARGIN, SIZE - MARGIN - THICKNESS, LEG, THICKNESS, AMBER);  // horizontal arm
drawRect(MARGIN, SIZE - MARGIN - LEG, THICKNESS, LEG, AMBER);        // vertical arm

// Bottom-right bracket
drawRect(SIZE - MARGIN - LEG, SIZE - MARGIN - THICKNESS, LEG, THICKNESS, AMBER); // horizontal
drawRect(SIZE - MARGIN - THICKNESS, SIZE - MARGIN - LEG, THICKNESS, LEG, AMBER); // vertical

// Output
const outPath = path.join(__dirname, '..', 'assets', 'icon.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const buffer = PNG.sync.write(png);
fs.writeFileSync(outPath, buffer);
console.log(`Written: ${outPath} (${SIZE}x${SIZE})`);
