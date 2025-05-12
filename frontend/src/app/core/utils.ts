export function rgbToHex(color: RGBColor): string {
  return "#" + [color.r, color.g, color.b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");
}

export type RGBColor = {
  r: number;
  g: number;
  b: number;
}
