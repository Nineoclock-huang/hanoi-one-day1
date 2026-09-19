// Run with SHARP_MODULE pointing to an installed sharp package, or install sharp locally.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE || 'sharp');
await mkdir('public/optimized', { recursive: true });
for (const [name, source, widths] of [
  ['clerk', 'public/lac-clerk.png', [448, 768]],
  ['guide', 'public/hanoi-guide.png', [320, 640]],
  ['cafe', 'src/assets/hanoi-cafe-interior.png', [800, 1600]],
]) {
  for (const width of widths) {
    const file = `public/optimized/${name}-${width}.webp`;
    const result = await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 83, effort: 6 }).toFile(file);
    console.log(`${file}: ${result.size} bytes`);
  }
}
