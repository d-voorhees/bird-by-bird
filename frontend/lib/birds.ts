export const BIRD_IMAGES = [
  "Artboard1.svg",
  "Artboard2.svg",
  "Artboard3.svg",
  "Artboard4.svg",
  "Artboard5.svg",
  "Artboard6.svg",
  "Artboard8.svg",
  "Artboard9.svg",
  "Artboard10.svg",
  "Artboard11.svg",
  "Artboard12.svg",
  "Artboard13.svg",
  "Artboard16.svg",
  "Artboard17.svg",
  "Artboard18.svg",
  "Artboard19.svg",
  "Artboard20.svg",
  "Artboard22.svg",
  "Artboard23.svg",
  "Artboard25.svg",
  "Artboard27.svg",
  "Artboard28.svg",
] as const;

export type BirdImageName = (typeof BIRD_IMAGES)[number];
export const FALLBACK_BIRD_IMAGE: BirdImageName = BIRD_IMAGES[0];

export function birdImageSrc(filename: string | null | undefined): string | null {
  if (!filename || !filename.trim()) return `/img/${FALLBACK_BIRD_IMAGE}`;
  return `/img/${filename}`;
}
