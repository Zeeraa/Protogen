import { uuidv7 } from "uuidv7";
import { AbstractVisorColorEffect } from "./AbstractVisorColorEffect";
import { StaticVisorColorEffect } from "./effects/StaticVisorColorEffect";

export const VisorColorEffects: VisorColorEffectMetadata[] = [
  {
    name: "Static",
    description: "Static non animated color",
    class: StaticVisorColorEffect,
  }
]

export function constructVisorColorEffect(effectName: string, id: string | null = null, displayName: string): AbstractVisorColorEffect | null {
  if (id == null) {
    id = uuidv7();
  }

  const effect = VisorColorEffects.find(e => e.name == effectName);
  if (effect == null) {
    return null;
  }

  return new effect.class(id, effectName, displayName);
}

type EffectClass = { new(id: string, effectName: string, displayName: string): AbstractVisorColorEffect };

interface VisorColorEffectMetadata {
  name: string;
  description: string;
  class: EffectClass;
}
