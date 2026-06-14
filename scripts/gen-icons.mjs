// Generiert die PWA-Icons aus einem SVG-Logo via sharp.
// Aufruf: npm run icons
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = new URL("../public/", import.meta.url);
await mkdir(OUT, { recursive: true });

// Basketball-Logo auf dunklem Hintergrund (für normale Icons)
const logo = (bg) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${bg}"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#F2762E" stroke-width="22"/>
  <path d="M106 256h300M256 106v300M152 152c70 48 70 160 0 208M360 152c-70 48-70 160 0 208"
        fill="none" stroke="#F2762E" stroke-width="18" stroke-linecap="round"/>
</svg>`;

// Maskable: Logo kleiner (Safe-Zone), vollflächiger Hintergrund
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#14181C"/>
  <g transform="translate(256 256) scale(0.62) translate(-256 -256)">
    <circle cx="256" cy="256" r="150" fill="none" stroke="#F2762E" stroke-width="22"/>
    <path d="M106 256h300M256 106v300M152 152c70 48 70 160 0 208M360 152c-70 48-70 160 0 208"
          fill="none" stroke="#F2762E" stroke-width="18" stroke-linecap="round"/>
  </g>
</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png();

async function write(name, buf) {
  await buf.toFile(new URL(name, OUT).pathname);
  console.log("✓", name);
}

await write("pwa-192x192.png", png(logo("#14181C"), 192));
await write("pwa-512x512.png", png(logo("#14181C"), 512));
await write("pwa-maskable-512x512.png", png(maskable, 512));
await write("apple-touch-icon.png", png(logo("#14181C"), 180));

console.log("Icons fertig.");
