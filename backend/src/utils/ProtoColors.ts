import { encodeRGB } from "./Utils";

export const ProtoColors = {
  black: encodeRGB(0, 0, 0),
  white: encodeRGB(255, 255, 255),
  red: encodeRGB(255, 0, 0),
  green: encodeRGB(0, 255, 0),
  blue: encodeRGB(0, 0, 255),
}

Object.freeze(ProtoColors);