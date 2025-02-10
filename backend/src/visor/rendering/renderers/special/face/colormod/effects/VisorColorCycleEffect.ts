import { BoolPropInputType, RgbEffectBoolProperty } from "../../../../../../../rgb/effects/properties/variants/RgbEffectBoolProperty";
import { RgbEffectIntProperty } from "../../../../../../../rgb/effects/properties/variants/RgbEffectIntProperty";
import { hueToRGB } from "../../../../../../../utils/ProtoColors";
import { AbstractVisorColorEffect } from "../AbstractVisorColorEffect";

export class VisorColorCycleEffect extends AbstractVisorColorEffect {
  private _hue: number;

  private _speedProp;
  private _reverseProp;

  constructor(id: string, name: string, displayName: string) {
    super(id, name, displayName);
    this._hue = 0;

    this._speedProp = new RgbEffectIntProperty("Speed", 1, { min: 1, max: 360 });
    this._reverseProp = new RgbEffectBoolProperty("Reverse", false, { inputType: BoolPropInputType.Switch });

    this.addProperty(this._speedProp);
    this.addProperty(this._reverseProp);
  }

  public onFixedTickRate(): void {
    if (this._reverseProp.value) {
      this._hue -= (this._speedProp.value / 20);
    } else {
      this._hue += (this._speedProp.value / 20);
    }
    this._hue = (this._hue % 360 + 360) % 360;
  }

  public apply(data: number[], _w: number, _h: number, _t: number): void {
    const color = hueToRGB(this._hue % 360);

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
