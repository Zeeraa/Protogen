import { ProtoColors } from "../../../utils/ProtoColors";
import { AbstractRgbEffect } from "../AbstractRgbEffect";

export class StaticRgbEffect extends AbstractRgbEffect {
  constructor(id: string, name: string, displayName: string) {
    super(id, name, displayName);
  }

  public render(): number[] {
    const leds: number[] = [];
    for (let i = 0; i < this.width; i++) {
      leds.push(ProtoColors.white);
    }
    return leds;
  }
}