// eslint-disable-next-line no-useless-escape
export const UrlPattern = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;

export function extractYouTubeVideoId(url: string): string | null {
  const youtubeRegex = /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/;
  const youtuBeRegex = /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/;

  let match = url.match(youtubeRegex);
  if (match && match[1]) {
    return match[1];
  }

  match = url.match(youtuBeRegex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

export function nullToUndefined<T>(input: T | null): T | undefined {
  if (input == null) {
    return undefined;
  }
  return input;
}

export function typeAssert<T>(input: any): T {
  return input as T;
}

export function undefinedToNull<T>(input: T | null | undefined): T | null {
  if (input == undefined) {
    return null;
  }
  return input;
}

export function numberToHexColor(num: number): string {
  num = Math.max(0, Math.min(0xFFFFFF, num));
  const hex = num.toString(16).toUpperCase();
  return "#" + hex.padStart(6, "0");
}

export function hexColorToNumber(hex: string): number {
  hex = hex.replace("#", "");
  return parseInt(hex, 16);
}

export function rgbToHex(color: RGBColor): string {
  return "#" + [color.r, color.g, color.b]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    })
    .join("");
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGBColor | null {
  if (!/^#?[0-9A-Fa-f]{6}$/.test(hex)) return null;

  // Remove the hash if present
  hex = hex.replace(/^#/, '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return { r, g, b };
}
