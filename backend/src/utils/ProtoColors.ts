import { encodeRGB } from "./Utils";

export const ProtoColors = {
  black: encodeRGB(0, 0, 0),
  white: encodeRGB(255, 255, 255),
  red: encodeRGB(255, 0, 0),
  green: encodeRGB(0, 255, 0),
  blue: encodeRGB(0, 0, 255),
}

Object.freeze(ProtoColors);

export function hueToRGB(hue: number): { r: number, g: number, b: number } {
  const s = 1;
  const l = 0.5;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (hue >= 0 && hue < 60) {
    r = c; g = x; b = 0;
  } else if (hue >= 60 && hue < 120) {
    r = x; g = c; b = 0;
  } else if (hue >= 120 && hue < 180) {
    r = 0; g = c; b = x;
  } else if (hue >= 180 && hue < 240) {
    r = 0; g = x; b = c;
  } else if (hue >= 240 && hue < 300) {
    r = x; g = 0; b = c;
  } else if (hue >= 300 && hue < 360) {
    r = c; g = 0; b = x;
  }

  // Normalize to [0, 255] range
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return { r, g, b };
}