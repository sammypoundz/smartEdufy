import sharp from 'sharp';

// Composite the (transparent) logo onto a light-blue rounded square.
// Source is the untouched original logo, NOT the already-composited output.
const SRC = 'smartedufy_icon.png';
const OUT = 'public/smart-edufy-icon.png';
const SIZE = 256;
const PAD = Math.round(SIZE * 0.12);           // 12% padding
const R = Math.round(SIZE * 0.22);             // rounded corner radius

const svgBg = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="${R}" fill="#dbeafe"/></svg>`
);

const logo = await sharp(SRC)
  .resize(SIZE - PAD * 2, SIZE - PAD * 2, { fit: 'inside' })
  .png()
  .toBuffer();
const meta = await sharp(logo).metadata();

await sharp(svgBg)
  .composite([
    {
      input: logo,
      left: Math.round((SIZE - meta.width) / 2),
      top: Math.round((SIZE - meta.height) / 2),
    },
  ])
  .png()
  .toFile(OUT);

console.log('wrote', OUT);
