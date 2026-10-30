// frontend/scripts/generate-og.mjs
// Builds the 1200x630 Open Graph card from real product screenshots + logo.
// Run: node scripts/generate-og.mjs  (requires: npm i --no-save sharp)
import sharp from "sharp";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(root, "src", "assets");
const pub = path.join(root, "public");

const W = 1200, H = 630;
const FONT = "Segoe UI, Arial, Helvetica, sans-serif";

// ---------- layout ----------
// Left column (x 60..500): logo lockup, headline, features, url pill.
// Right side (x 520..1160): desktop dashboard screenshot + phone overlap.
const DESK = { x: 560, y: 118, w: 600, h: 360 }; // dashboard panel
const PHONE = { x: 1010, y: 250, w: 148, h: 320 };

// ---------- screenshot prep ----------
// Desktop: crop off the browser/taskbar chrome, keep the app UI.
const desktop = await sharp(path.join(assets, "dexktopView.jpeg"))
  .extract({ left: 0, top: 0, width: 1600, height: 830 })
  .resize(DESK.w, DESK.h, { fit: "cover", position: "top" })
  .png()
  .toBuffer();

const desktopRounded = await sharp(desktop)
  .composite([
    {
      input: Buffer.from(
        `<svg width="${DESK.w}" height="${DESK.h}"><rect width="${DESK.w}" height="${DESK.h}" rx="18" fill="#fff"/></svg>`
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

// Mobile: crop tightly around the phone in the source, keep its dark frame.
const meta = await sharp(path.join(assets, "mobileView.png")).metadata();
const phone = await sharp(path.join(assets, "mobileView.png"))
  .extract({
    left: Math.round(meta.width * 0.08),
    top: Math.round(meta.height * 0.05),
    width: Math.round(meta.width * 0.84),
    height: Math.round(meta.height * 0.9),
  })
  .resize(PHONE.w, PHONE.h, { fit: "cover" })
  .png()
  .toBuffer();

const phoneRounded = await sharp(phone)
  .composite([
    {
      input: Buffer.from(
        `<svg width="${PHONE.w}" height="${PHONE.h}"><rect width="${PHONE.w}" height="${PHONE.h}" rx="22" fill="#fff"/></svg>`
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

const logoBuf = await sharp(path.join(pub, "smart-edufy-icon.png"))
  .resize(112, 112)
  .png()
  .toBuffer();

// ---------- SVG chrome ----------
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="55%" stop-color="#101c38"/>
      <stop offset="100%" stop-color="#1d2c63"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
    <linearGradient id="pill" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- backdrop -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1120" cy="-40" r="420" fill="url(#glow2)"/>
  <circle cx="40" cy="660" r="380" fill="url(#glow1)"/>

  <!-- ===== left column ===== -->
  <!-- logo lockup -->
  <g transform="translate(60,58)">
    <image href="data:image/png;base64,__LOGO__" x="0" y="0" width="58" height="58"/>
    <text x="74" y="30" font-family="${FONT}" font-size="32" font-weight="800" fill="#ffffff">SmartEdufy</text>
    <text x="74" y="54" font-family="${FONT}" font-size="16" font-weight="500" fill="#9db4e8">AI Powered Education Ecosystem</text>
  </g>

  <!-- headline -->
  <text x="60" y="220" font-family="${FONT}" font-size="38" font-weight="800" fill="#ffffff">The Future of School</text>
  <text x="60" y="270" font-family="${FONT}" font-size="38" font-weight="800" fill="url(#accent)">Management is Here.</text>
  <text x="60" y="318" font-family="${FONT}" font-size="16.5" font-weight="400" fill="#b9c8ea">Admin, teachers, parents &amp; students —</text>
  <text x="60" y="344" font-family="${FONT}" font-size="16.5" font-weight="400" fill="#b9c8ea">one smart platform.</text>

  <!-- feature bullets -->
  <g font-family="${FONT}" font-size="14.5" font-weight="600">
    <circle cx="70" cy="398" r="4.5" fill="#60a5fa"/>
    <text x="87" y="404" fill="#dbe7ff">AI-assisted grading</text>
    <circle cx="268" cy="398" r="4.5" fill="#a78bfa"/>
    <text x="285" y="404" fill="#dbe7ff">Live analytics</text>
    <circle cx="70" cy="432" r="4.5" fill="#60a5fa"/>
    <text x="87" y="438" fill="#dbe7ff">Fees &amp; payroll</text>
    <circle cx="268" cy="432" r="4.5" fill="#a78bfa"/>
    <text x="285" y="438" fill="#dbe7ff">Timetables</text>
  </g>

  <!-- url pill -->
  <g transform="translate(60,486)">
    <rect x="0" y="0" width="300" height="56" rx="28" fill="url(#pill)"/>
    <text x="30" y="37" font-family="${FONT}" font-size="23" font-weight="700" fill="#ffffff">smartedufy.ng</text>
  </g>
  <text x="60" y="580" font-family="${FONT}" font-size="15" fill="#7f97cf" font-weight="500">Built for schools of every size. Start in minutes.</text>

  <!-- ===== right: screenshots ===== -->
  <!-- desktop panel: frame + shadow ring -->
  <rect x="${DESK.x - 10}" y="${DESK.y - 10}" width="${DESK.w + 20}" height="${DESK.h + 20}" rx="24" fill="#0e1a33" stroke="#3b82f6" stroke-opacity="0.5" stroke-width="2"/>
  <image href="__DESKTOP__" x="${DESK.x}" y="${DESK.y}" width="${DESK.w}" height="${DESK.h}"/>

  <!-- phone: dark bezel + screenshot -->
  <rect x="${PHONE.x - 8}" y="${PHONE.y - 8}" width="${PHONE.w + 16}" height="${PHONE.h + 16}" rx="28" fill="#0a1120" stroke="#4c6ef5" stroke-opacity="0.7" stroke-width="2"/>
  <image href="__PHONE__" x="${PHONE.x}" y="${PHONE.y}" width="${PHONE.w}" height="${PHONE.h}"/>
</svg>`;

const composed = svg
  .replace("__LOGO__", logoBuf.toString("base64"))
  .replace("__DESKTOP__", "data:image/png;base64," + desktopRounded.toString("base64"))
  .replace("__PHONE__", "data:image/png;base64," + phoneRounded.toString("base64"));

await sharp(Buffer.from(composed))
  .png({ compressionLevel: 9 })
  .toFile(path.join(pub, "og-image.png"));

console.log("✅ OG image written to frontend/public/og-image.png");
