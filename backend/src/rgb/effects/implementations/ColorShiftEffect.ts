import { Protogen } from "../../../Protogen";
import { hueToRGB } from "../../../utils/ProtoColors";
import { encodeRGB } from "../../../utils/Utils";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { BoolPropInputType, RgbEffectBoolProperty } from "../properties/variants/RgbEffectBoolProperty";
import { RgbEffectIntProperty } from "../properties/variants/RgbEffectIntProperty";

export class ColorShiftEffect extends AbstractRgbEffect {
  private _speedProp;
  private _offsetProp;
  private _reverseProp;

  constructor(id: string, name: string, displayName: string, protogen: Protogen) {
    super(id, name, displayName, protogen);

    this._speedProp = new RgbEffectIntProperty("Speed", 30, { min: 1, max: 360 }, "The speed of the animation. Hue will be changed by this value every second");
    this._offsetProp = new RgbEffectIntProperty("Offset", 0, { min: 0, max: 360 }, "The hue offset to apply");
    this._reverseProp = new RgbEffectBoolProperty("Reverse", false, { inputType: BoolPropInputType.Switch }, "Decrease hue every second instead of increasing");

    this.addProperty(this._speedProp);
    this.addProperty(this._offsetProp);
    this.addProperty(this._reverseProp);
  }

  public render(time: number): (number | null)[] {
    const adjustedTimeValue = this._offsetProp.value + ((this._reverseProp ? time * -1 : time) / 1000) * this._speedProp.value;
    const hue = ((adjustedTimeValue % 360) + 360) % 360;

    const { r, g, b } = hueToRGB(hue);
    const encoded = encodeRGB(r, g, b);


    const encodedValues: number[] = [];
    for (let i = 0; i < this.width; i++) {
      encodedValues.push(encoded);
    }

    return encodedValues;
  }
}
