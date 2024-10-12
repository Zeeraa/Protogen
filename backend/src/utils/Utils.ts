export function sleep(milliseconds: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

export function encodeRGB(r: number, g: number, b: number): number {
  // Ensure the values are within the 0-255 range
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  // Combine RGB into a single number (0xRRGGBB format)
  return (r << 16) | (g << 8) | b;
}