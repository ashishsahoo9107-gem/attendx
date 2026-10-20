const fs = require("node:fs");
const path = require("node:path");
const source = path.join(process.cwd(), "public");
const target = path.join(process.cwd(), "dist");
if (!fs.existsSync(source)) { console.warn("No public folder found; skipping PWA asset copy."); process.exit(0); }
fs.cpSync(source, target, { recursive: true });
console.log("Copied PWA manifest, service worker and icons into dist/.");
