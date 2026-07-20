import { copyFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const mark = await readFile(path.join(root, 'public/brand/renuevo-mark.svg'));
const background = { r: 6, g: 13, b: 24, alpha: 1 };
const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
const splashes = [[1170, 2532], [1179, 2556], [1290, 2796], [1668, 2388], [2048, 2732], [750, 1334]];

async function renderIcon(size) {
  const markSize = Math.round(size * (size <= 32 ? 0.84 : 0.68));
  const renderedMark = await sharp(mark).resize(markSize, markSize, { fit: 'contain' }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: renderedMark, gravity: 'center' }])
    .png()
    .toFile(path.join(root, `public/icons/icon-${size}.png`));
}

for (const size of iconSizes) await renderIcon(size);
await copyFile(path.join(root, 'public/icons/icon-16.png'), path.join(root, 'public/favicon-16.png'));
await copyFile(path.join(root, 'public/icons/icon-32.png'), path.join(root, 'public/favicon-32.png'));
await copyFile(path.join(root, 'public/icons/icon-180.png'), path.join(root, 'public/icons/apple-touch-icon.png'));

const whiteBadge = await sharp(mark).resize(54, 54, { fit: 'contain' }).tint('#ffffff').png().toBuffer();
await sharp({ create: { width: 72, height: 72, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: whiteBadge, gravity: 'center' }])
  .png()
  .toFile(path.join(root, 'public/icons/badge-72.png'));

for (const [width, height] of splashes) {
  const markSize = Math.round(Math.min(width, height) * 0.28);
  const titleFontSize = Math.round(markSize * 0.2);
  const subtitleFontSize = Math.round(markSize * 0.15);
  const labelHeight = Math.round(markSize * 0.55);
  const gap = Math.round(markSize * 0.075);
  const titleBaseline = Math.round(labelHeight * 0.37);
  const subtitleBaseline = Math.round(labelHeight * 0.78);
  const renderedMark = await sharp(mark).resize(markSize, markSize, { fit: 'contain' }).png().toBuffer();
  const label = Buffer.from(`<svg width="${width}" height="${labelHeight}"><text x="50%" y="${titleBaseline}" text-anchor="middle" fill="#F4F7FA" font-family="Arial, sans-serif" font-size="${titleFontSize}" font-weight="700">Renuevo</text><text x="50%" y="${subtitleBaseline}" text-anchor="middle" fill="#AAB8C7" font-family="Arial, sans-serif" font-size="${subtitleFontSize}" font-weight="500">Music</text></svg>`);
  const markTop = Math.round((height - markSize - gap - labelHeight) / 2);
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([
      { input: renderedMark, left: Math.round((width - markSize) / 2), top: markTop },
      { input: label, left: 0, top: markTop + markSize + gap },
    ])
    .png()
    .toFile(path.join(root, `public/splash-${width}x${height}.png`));
}
