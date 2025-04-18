import { Protogen } from "../../../Protogen";
import { ProtoColors } from "../../../utils/ProtoColors";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { RgbEffectColorProperty } from "../properties/variants/RgbEffectColorProperty";

export class StaticRgbEffect extends AbstractRgbEffect {
  private _propColor;

  constructor(id: string, name: string, displayName: string, protogen: Protogen) {
    super(id, name, displayName, protogen);
    this._propColor = new RgbEffectColorProperty("Color", ProtoColors.black, "The color to set the LEDs to");
    this.addProperty(this._propColor);
  }

  public render(_: number): (number | null)[] {
    const leds: number[] = [];
    for (let i = 0; i < this.width; i++) {
      leds.push(this._propColor.value);
    }
    return leds;
  }
}
