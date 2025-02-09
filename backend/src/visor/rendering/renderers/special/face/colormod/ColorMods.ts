import { uuidv7 } from "uuidv7";
import { AbstractColorMod } from "./AbstractColorMod";
import { StaticColorMod } from "./effects/StaticColorMod";

export const ColorMods: ColorModMetadata[] = [
  {
    name: "Static",
    description: "Static non animated color",
    class: StaticColorMod,
  }
]

export function constructRgbEffect(name: string, id: string | null = null): AbstractColorMod | null {
  if (id == null) {
    id = uuidv7();
  }

  const effect = ColorMods.find(e => e.name == name);
  if (effect == null) {
    return null;
  }

  return new effect.class(id, name);
}

type ColorModClass = { new(id: string, name: string): AbstractColorMod };

interface ColorModMetadata {
  name: string;
  description: string;
  class: ColorModClass;
}
