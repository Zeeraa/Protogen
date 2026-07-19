import { Protogen } from "../../../Protogen";
import { hueToRGB } from "../../../utils/ProtoColors";
import { decodeRGB, encodeRGB } from "../../../utils/Utils";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { BoolPropInputType, RgbEffectBoolProperty } from "../properties/variants/RgbEffectBoolProperty";
import { IntPropInputType, RgbEffectIntProperty } from "../properties/variants/RgbEffectIntProperty";
import { RgbEffectColorProperty } from "../properties/variants/RgbEffectColorProperty";

export class AudioReactiveEffect extends AbstractRgbEffect {
  private _modeProperty: RgbEffectIntProperty;
  private _colorBaseProperty: RgbEffectColorProperty;
  private _colorCycleProperty: RgbEffectBoolProperty;
  private _cycleSpeedProperty: RgbEffectIntProperty;
  private _rainbowWaveProperty: RgbEffectBoolProperty;
  private _rainbowSpeedProperty: RgbEffectIntProperty;
  private _smoothingProperty: RgbEffectIntProperty;
  private _splitProperty: RgbEffectBoolProperty;
  private _invertDirectionProperty: RgbEffectBoolProperty;
  private _maxBrightnessProperty: RgbEffectIntProperty;

  constructor(id: string, name: string, displayName: string, protogen: Protogen) {
    super(id, name, displayName, protogen);

    // Mode: 0=intensity, 1=spectrum, 2=beat_pulse
    this._modeProperty = new RgbEffectIntProperty(
      "Mode",
      0,
      {
        min: 0,
        max: 2,
        inputType: IntPropInputType.Select,
        selectOptions: [
          { label: "Intensity Bars", value: 0 },
          { label: "Frequency Spectrum", value: 1 },
          { label: "Beat Pulse", value: 2 },
        ]
      },
      "Visualization mode: 0=Intensity Bars, 1=Frequency Spectrum, 2=Beat Pulse"
    );

    this._colorBaseProperty = new RgbEffectColorProperty(
      "Color",
      encodeRGB(255, 0, 0),
      "Base picker color for lighting"
    );

    this._colorCycleProperty = new RgbEffectBoolProperty(
      "ColorCycle",
      false,
      { inputType: BoolPropInputType.Switch },
      "Enable automatic hue progression of base color over time"
    );

    this._cycleSpeedProperty = new RgbEffectIntProperty(
      "CycleSpeed",
      10,
      { min: 1, max: 100, inputType: IntPropInputType.Slider },
      "Color cycling transition speed"
    );

    this._rainbowWaveProperty = new RgbEffectBoolProperty(
      "RainbowWave",
      false,
      { inputType: BoolPropInputType.Switch },
      "Enable moving rainbow spectrum gradient across addressable pixels"
    );

    this._rainbowSpeedProperty = new RgbEffectIntProperty(
      "RainbowSpeed",
      10,
      { min: 1, max: 100, inputType: IntPropInputType.Slider },
      "Moving speed of the rainbow wave gradient"
    );

    this._smoothingProperty = new RgbEffectIntProperty(
      "Smoothing",
      5,
      { min: 0, max: 20, inputType: IntPropInputType.Slider },
      "Smoothing rate (higher = dampens sudden peaks)"
    );

    this._splitProperty = new RgbEffectBoolProperty(
      "Split",
      false,
      { inputType: BoolPropInputType.Switch },
      "Renders outward from the middle of the strip to the edges"
    );

    this._invertDirectionProperty = new RgbEffectBoolProperty(
      "InvertDirection",
      false,
      { inputType: BoolPropInputType.Switch },
      "Reverses rendering direction (or edges inward if split is on)"
    );

    this._maxBrightnessProperty = new RgbEffectIntProperty(
      "MaxBrightness",
      255,
      { min: 1, max: 255, inputType: IntPropInputType.Slider },
      "Maximum brightness scale limit for addressable RGB LEDs (1-255)"
    );

    this.addProperty(this._modeProperty);
    this.addProperty(this._colorBaseProperty);
    this.addProperty(this._colorCycleProperty);
    this.addProperty(this._cycleSpeedProperty);
    this.addProperty(this._rainbowWaveProperty);
    this.addProperty(this._rainbowSpeedProperty);
    this.addProperty(this._smoothingProperty);
    this.addProperty(this._splitProperty);
    this.addProperty(this._invertDirectionProperty);
    this.addProperty(this._maxBrightnessProperty);
  }

  public render(time: number): (number | null)[] {
    const data = this.protogen.audioVisualiser.latestData;

    if (!data) {
      // Default fallback color if no audio source active
      return new Array(this.width).fill(0);
    }

    const mode = this._modeProperty.value;
    const isSplit = this._splitProperty.value;
    const isInverted = this._invertDirectionProperty.value;

    const renderWidth = isSplit ? Math.ceil(this.width / 2) : this.width;

    let subArray: number[];
    switch (mode) {
      case 0: // intensity
        subArray = this.renderIntensityBars(data, time, renderWidth);
        break;
      case 1: // spectrum
        subArray = this.renderFrequencySpectrum(data, time, renderWidth);
        break;
      case 2: // beat_pulse
        subArray = this.renderBeatPulse(data, time, renderWidth);
        break;
      default:
        subArray = this.renderIntensityBars(data, time, renderWidth);
        break;
    }

    if (isSplit) {
      // Bilateral mapping from subArray (width renderWidth) to final array (width this.width)
      // Reverse subArray if we want edges-to-middle behavior (InvertDirection)
      if (isInverted) {
        subArray.reverse();
      }

      const result = new Array(this.width).fill(0);
      const halfWidth = renderWidth;

      for (let i = 0; i < halfWidth; i++) {
        const val = subArray[i];
        // Calculate symmetric indices from the center outwards
        if (this.width % 2 === 1) {
          // Odd: center index is halfWidth - 1
          const center = halfWidth - 1;
          if (center - i >= 0) result[center - i] = val;
          if (center + i < this.width) result[center + i] = val;
        } else {
          // Even: centers are halfWidth - 1 and halfWidth
          const leftCenter = halfWidth - 1;
          const rightCenter = halfWidth;
          if (leftCenter - i >= 0) result[leftCenter - i] = val;
          if (rightCenter + i < this.width) result[rightCenter + i] = val;
        }
      }
      return result;
    } else {
      // Standard layout
      if (isInverted) {
        subArray.reverse();
      }
      return subArray;
    }
  }

  private getLedColorForIndex(i: number, time: number): number {
    const baseColorVal = this._colorBaseProperty.value;
    const baseRGB = decodeRGB(baseColorVal);
    const baseHue = rgbToHue(baseRGB.r, baseRGB.g, baseRGB.b);

    // Apply color cycling
    let cycleOffset = 0;
    if (this._colorCycleProperty.value) {
      cycleOffset = (time * this._cycleSpeedProperty.value * 0.01) % 360;
    }
    const currentBaseHue = (baseHue + cycleOffset) % 360;

    let finalHue = currentBaseHue;

    if (this._rainbowWaveProperty.value) {
      // Create rainbow gradient across active range shifted in direction of movement
      const rainbowOffset = (time * this._rainbowSpeedProperty.value * 0.01) % 360;
      finalHue = (currentBaseHue + (i / this.width) * 360 + rainbowOffset) % 360;
    }

    const { r, g, b } = hueToRGB(finalHue);
    
    // Apply MaxBrightness scale adjustment (1-255 scaling)
    const maxB = this._maxBrightnessProperty.value;
    const scale = maxB / 255.0;
    
    return encodeRGB(
      Math.round(r * scale),
      Math.round(g * scale),
      Math.round(b * scale)
    );
  }

  private renderIntensityBars(data: any, time: number, customWidth: number): number[] {
    const colors: number[] = [];
    const numLeds = Math.floor(customWidth * data.intensity);

    for (let i = 0; i < customWidth; i++) {
      if (i < numLeds) {
        colors.push(this.getLedColorForIndex(i, time));
      } else {
        colors.push(0); // Black
      }
    }

    return colors;
  }

  private renderFrequencySpectrum(data: any, time: number, customWidth: number): number[] {
    const colors: number[] = [];
    const bands = [
      data.bands.sub_bass,
      data.bands.bass,
      data.bands.low_mids,
      data.bands.mids,
      data.bands.high_mids,
      data.bands.highs,
      data.bands.presence
    ];

    const ledsPerBand = Math.floor(customWidth / bands.length);

    for (let i = 0; i < bands.length; i++) {
      const bandIntensity = bands[i];
      const bandLeds = Math.floor(ledsPerBand * bandIntensity);

      for (let j = 0; j < ledsPerBand; j++) {
        const ledIndex = i * ledsPerBand + j;
        if (j < bandLeds) {
          colors.push(this.getLedColorForIndex(ledIndex, time));
        } else {
          colors.push(0);
        }
      }
    }

    // Fill remaining LEDs if any
    while (colors.length < customWidth) {
      colors.push(0);
    }

    return colors.slice(0, customWidth);
  }

  private renderBeatPulse(data: any, time: number, customWidth: number): number[] {
    const colors: number[] = [];

    // Scale intensity of overall colors on beat
    let brightness = data.intensity;
    if (data.beat) {
      brightness = 1.0; // Full brightness on beat pulse
    }

    for (let i = 0; i < customWidth; i++) {
      const col = this.getLedColorForIndex(i, time);
      const dec = decodeRGB(col);
      const dimmed = encodeRGB(
        Math.floor(dec.r * brightness),
        Math.floor(dec.g * brightness),
        Math.floor(dec.b * brightness)
      );
      colors.push(dimmed);
    }

    return colors;
  }
}

// Convert standard RGB to circular hue [0, 360) range
function rgbToHue(r: number, g: number, b: number): number {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max === min) {
    h = 0;
  } else {
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return h * 360;
}
