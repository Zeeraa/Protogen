import { uuidv7 } from "uuidv7";
import { AbstractRgbEffect } from "./AbstractRgbEffect";
import { StaticRgbEffect } from "./implementations/StaticRgbEffect";
import { RgbWaveEffect } from "./implementations/RgbWaveEffect";
import { ColorShiftEffect } from "./implementations/ColorShiftEffect";

export const RgbEffects: RgbEffect[] = [
  {
    name: "Static",
    description: "Static non animated color",
    class: StaticRgbEffect,
  },
  {
    name: "RGB Wave",
    description: "An animated rgb wave. Speed can be set to 0 to disable animation",
    class: RgbWaveEffect,
  },
  {
    name: "Color shift",
    description: "Single shifting color",
    class: ColorShiftEffect,
  }
]

export function constructRgbEffect(name: string, displayName: string, id: string | null = null): AbstractRgbEffect | null {
  if (id == null) {
    id = uuidv7();
  }

  const effect = RgbEffects.find(e => e.name == name);
  if (effect == null) {
    return null;
  }

  return new effect.class(id, name, displayName);
}

type EffectClass = { new(id: string, name: string, displayName: string): AbstractRgbEffect };

interface RgbEffect {
  name: string;
  description: string;
  class: EffectClass;
}