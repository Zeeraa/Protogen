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


export function undefinedToNull<T>(input: T | null | undefined): T | null {
  if (input == undefined) {
    return null;
  }
  return input;
}

export function numberToHexColor(num: number): string {
  num = Math.max(0, Math.min(0xFFFFFF, num));
  let hex = num.toString(16).toUpperCase();
  return "#" + hex.padStart(6, "0");
}

export function hexColorToNumber(hex: string): number {
  hex = hex.replace("#", "");
  return parseInt(hex, 16);
}
