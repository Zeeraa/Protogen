import { RgbEffectColorProperty } from "../../../../../../../rgb/effects/properties/variants/RgbEffectColorProperty";
import { ProtoColors } from "../../../../../../../utils/ProtoColors";
import { decodeRGB } from "../../../../../../../utils/Utils";
import { AbstractVisorColorEffect } from "../AbstractVisorColorEffect";

export class StaticVisorColorEffect extends AbstractVisorColorEffect {
  private _propColor;

  constructor(id: string, name: string, displayName: string) {
    super(id, name, displayName);
    this._propColor = new RgbEffectColorProperty("Color", ProtoColors.white, "The color to apply to the expression");
    this.addProperty(this._propColor);
  }

  public apply(data: number[], _w: number, _h: number, _t: number): void {
    const color = decodeRGB(this._propColor.value);


    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Check if the pixel is white (allowing slight tolerance)
      if (r > 250 && g > 250 && b > 250 && a > 0) {
        data[i] = color.r;
        data[i + 1] = color.g;
        data[i + 2] = color.b;
      }
    }
  }
}
