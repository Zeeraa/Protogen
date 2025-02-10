import { BoolPropInputType, RgbEffectBoolProperty } from "../../../../../../../rgb/effects/properties/variants/RgbEffectBoolProperty";
import { RgbEffectIntProperty } from "../../../../../../../rgb/effects/properties/variants/RgbEffectIntProperty";
import { hueToRGB } from "../../../../../../../utils/ProtoColors";
import { AbstractVisorColorEffect } from "../AbstractVisorColorEffect";

export class VisorColorCycleEffect extends AbstractVisorColorEffect {
  private _speedProp;
  private _offsetProp;
  private _reverseProp;

  constructor(id: string, name: string, displayName: string) {
    super(id, name, displayName);

    this._speedProp = new RgbEffectIntProperty("Speed", 30, { min: 1, max: 360 });
    this._offsetProp = new RgbEffectIntProperty("Offset", 0, { min: 0, max: 360 });
    this._reverseProp = new RgbEffectBoolProperty("Reverse", false, { inputType: BoolPropInputType.Switch });

    this.addProperty(this._speedProp);
    this.addProperty(this._offsetProp);
    this.addProperty(this._reverseProp);
  }

  public apply(data: number[], _w: number, _h: number, time: number): void {
    const adjustedTimeValue = this._offsetProp.value + ((this._reverseProp ? time * -1 : time) / 1000) * this._speedProp.value;
    const hue = ((adjustedTimeValue % 360) + 360) % 360;
    const color = hueToRGB(hue);

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
