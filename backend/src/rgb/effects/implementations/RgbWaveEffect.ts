import { hueToRGB } from "../../../utils/ProtoColors";
import { encodeRGB } from "../../../utils/Utils";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { BoolPropInputType, RgbEffectBoolProperty } from "../properties/variants/RgbEffectBoolProperty";
import { IntPropInputType, RgbEffectIntProperty } from "../properties/variants/RgbEffectIntProperty";

export class RgbWaveEffect extends AbstractRgbEffect {
  private _propHueStart;
  private _propHueEnd;
  private _propSpeed;
  private _invertProperty;

  constructor(id: string, name: string, displayName: string) {
    super(id, name, displayName);
    this._propHueStart = new RgbEffectIntProperty("HueStart", 0, { min: 0, max: 360 }, "The HUE value to start at");
    this._propHueEnd = new RgbEffectIntProperty("HueEnd", 360, { min: 0, max: 360 }, "The HUE value to end at");
    this._propSpeed = new RgbEffectIntProperty("Speed", 5, { min: 0, max: 30, inputType: IntPropInputType.Slider }, "Speed the effect changes at. At the moment a smaller value means faster change bujt i will fix this in the future");
    this._invertProperty = new RgbEffectBoolProperty("Invert", false, { inputType: BoolPropInputType.Switch }, "Reverse RGB animation order");
    this.addProperty(this._propHueStart);
    this.addProperty(this._propHueEnd);
    this.addProperty(this._propSpeed);
    this.addProperty(this._invertProperty);
  }

  public render(time: number): (number | null)[] {
    const encodedValues: number[] = [];

    if (this._invertProperty.value == true) {
      time = 0 - time;
    }

    let offset = 0;
    if (this._propSpeed.value > 0) {
      offset = (time / this._propSpeed.value);
    }

    let startHue = normalizeHue(this._propHueStart.value);
    let endHue = normalizeHue(this._propHueEnd.value);

    // Normalize the offset to the [0, 360) range
    offset = normalizeHue(offset);

    // Input validation: if startHue is greater than endHue, swap them
    if (startHue > endHue) {
      [startHue, endHue] = [endHue, startHue];
    }
    // Handle the case where startHue and endHue are the same
    const stepSize = (startHue === endHue) ? 0 : (endHue - startHue) / (this.width - 1);
    for (let i = 0; i < this.width; i++) {
      let hue = startHue + i * stepSize + offset;

      // Normalize hue within the [0, 360) range
      hue = normalizeHue(hue);

      const { r, g, b } = hueToRGB(hue);
      const encoded = encodeRGB(r, g, b);
      encodedValues.push(encoded);
    }

    return encodedValues;
  }
}

// Helper function to normalize hue into the [0, 360) range
function normalizeHue(hue: number): number {
  if (hue == 360) {
    return hue;
  }
  return ((hue % 360) + 360) % 360;
}
