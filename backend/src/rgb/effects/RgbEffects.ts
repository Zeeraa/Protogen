import { AbstractRgbEffect } from "./AbstractRgbEffect";
import { StaticRgbEffect } from "./implementations/StaticRgbEffect";

export const RgbEffects: RgbEffect[] = [
  {
    name: "Static",
    description: "Static non animated color",
    class: StaticRgbEffect,
  }
]

type EffectClass = { new(id: string, name: string, displayName: string): AbstractRgbEffect };

interface RgbEffect {
  name: string;
  description: string;
  class: EffectClass;
}