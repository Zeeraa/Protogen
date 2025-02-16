import { Protogen } from "../../../Protogen";
import { hueToRGB, ProtoColors } from "../../../utils/ProtoColors";
import { encodeRGB } from "../../../utils/Utils";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { BoolPropInputType, RgbEffectBoolProperty } from "../properties/variants/RgbEffectBoolProperty";
import { RgbEffectColorProperty } from "../properties/variants/RgbEffectColorProperty";
import { IntPropInputType, RgbEffectIntProperty } from "../properties/variants/RgbEffectIntProperty";

export class AudioVisualizerEffect extends AbstractRgbEffect {
  private _propUseRgbWave;
  private _propStaticColor;
  private _propHueStart;
  private _propHueEnd;
  private _propSpeed;
  private _invertRgbProperty;
  private _invertProperty;

  constructor(id: string, name: string, displayName: string, protogen: Protogen) {
    super(id, name, displayName, protogen);
    this._propUseRgbWave = new RgbEffectBoolProperty("UseRgbWave", false, { inputType: BoolPropInputType.Switch }, "Use RGB wave");
    this._invertProperty = new RgbEffectBoolProperty("InvertDirection", false, { inputType: BoolPropInputType.Switch }, "Reverse order");
    this._propStaticColor = new RgbEffectColorProperty("StaticColor", ProtoColors.white, "Color");
    this._propHueStart = new RgbEffectIntProperty("HueStart", 0, { min: 0, max: 360 }, "The HUE value to start at");
    this._propHueEnd = new RgbEffectIntProperty("HueEnd", 360, { min: 0, max: 360 }, "The HUE value to end at");
    this._propSpeed = new RgbEffectIntProperty("Speed", 5, { min: 0, max: 30, inputType: IntPropInputType.Slider }, "Speed the effect changes at. At the moment a smaller value means faster change bujt i will fix this in the future");
    this._invertRgbProperty = new RgbEffectBoolProperty("InvertRgb", false, { inputType: BoolPropInputType.Switch }, "Reverse RGB animation order");
    this.addProperty(this._propUseRgbWave);
    this.addProperty(this._invertProperty);
    this.addProperty(this._propStaticColor);

    this.addProperty(this._propHueStart);
    this.addProperty(this._propHueEnd);
    this.addProperty(this._propSpeed);
    this.addProperty(this._invertRgbProperty);

  }

  public render(time: number): (number | null)[] {
    const encodedValues: number[] = [];

    if (this._propUseRgbWave.value == true) {
      if (this._invertRgbProperty.value == true) {
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
    } else {
      // Fill array with the static color value
      for (let i = 0; i < this.width; i++) {
        encodedValues.push(this._propStaticColor.value);
      }
    }

    const volume = this.protogen.audioVisualiser.getValue();

    const length = encodedValues.length;
    const numOn = Math.floor(length * volume); // Number of LEDs to keep unchanged
    const numOff = length - numOn; // Number of LEDs to set to 0

    if (this._invertProperty.value) {
      for (let i = 0; i < numOff; i++) {
        encodedValues[i] = ProtoColors.black;
      }
    } else {
      for (let i = length - numOff; i < length; i++) {
        encodedValues[i] = ProtoColors.black;
      }
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
