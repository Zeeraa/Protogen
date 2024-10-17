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

export function compareStringArrays(arr1: string[], arr2: string[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }

  return true;
}