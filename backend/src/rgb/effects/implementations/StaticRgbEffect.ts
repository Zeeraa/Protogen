import { ProtoColors } from "../../../utils/ProtoColors";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { RgbEffectColorProperty } from "../properties/variants/RgbEffectColorProperty";

export class StaticRgbEffect extends AbstractRgbEffect {
  private _propColor;

  constructor(id: string, name: string, displayName: string) {
    super(id, name, displayName);
    this._propColor = new RgbEffectColorProperty("Color", ProtoColors.black);
    this.addProperty(this._propColor);
  }

  public render(): (number | null)[] {
    const leds: number[] = [];
    for (let i = 0; i < this.width; i++) {
      leds.push(this._propColor.value);
    }
    return leds;
  }
}