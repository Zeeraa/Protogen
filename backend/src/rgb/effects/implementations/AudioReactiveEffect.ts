import { Protogen } from "../../../Protogen";
import { hueToRGB } from "../../../utils/ProtoColors";
import { encodeRGB } from "../../../utils/Utils";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { RgbEffectIntProperty, IntPropInputType } from "../properties/variants/RgbEffectIntProperty";

export class AudioReactiveEffect extends AbstractRgbEffect {
  private _modeProperty;
  private _colorBaseProperty;
  private _smoothingProperty;

  constructor(id: string, name: string, displayName: string, protogen: Protogen) {
    super(id, name, displayName, protogen);

    // Mode: 0=intensity, 1=spectrum, 2=beat_pulse, 3=style_adaptive
    this._modeProperty = new RgbEffectIntProperty(
      "Mode",
      0,
      { min: 0, max: 3, inputType: IntPropInputType.Slider },
      "Visualization mode: 0=Intensity Bars, 1=Frequency Spectrum, 2=Beat Pulse, 3=Style Adaptive"
    );

    this._colorBaseProperty = new RgbEffectIntProperty(
      "ColorBase",
      0,
      { min: 0, max: 360, inputType: IntPropInputType.Slider },
      "Base hue for colors (0-360)"
    );

    this._smoothingProperty = new RgbEffectIntProperty(
      "Smoothing",
      5,
      { min: 0, max: 20, inputType: IntPropInputType.Slider },
      "Smoothing amount (higher = smoother transitions)"
    );

    this.addProperty(this._modeProperty);
    this.addProperty(this._colorBaseProperty);
    this.addProperty(this._smoothingProperty);
  }

  public render(time: number): (number | null)[] {
    const data = this.protogen.audioVisualiser.latestData;

    if (!data) {
      // No audio data available, return black
      return new Array(this.width).fill(0);
    }

    const mode = this._modeProperty.value;

    switch (mode) {
      case 0: // intensity
        return this.renderIntensityBars(data);
      case 1: // spectrum
        return this.renderFrequencySpectrum(data);
      case 2: // beat_pulse
        return this.renderBeatPulse(data, time);
      case 3: // style_adaptive
        return this.renderStyleAdaptive(data, time);
      default:
        return this.renderIntensityBars(data);
    }
  }

  private renderIntensityBars(data: any): number[] {
    const colors: number[] = [];
    const numLeds = Math.floor(this.width * data.intensity);
    const baseHue = this._colorBaseProperty.value;

    for (let i = 0; i < this.width; i++) {
      if (i < numLeds) {
        // Calculate hue based on position
        const hue = (baseHue + (i / this.width) * 120) % 360;
        const { r, g, b } = hueToRGB(hue);
        colors.push(encodeRGB(r, g, b));
      } else {
        colors.push(0); // Black
      }
    }

    return colors;
  }

  private renderFrequencySpectrum(data: any): number[] {
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

    const baseHue = this._colorBaseProperty.value;
    const ledsPerBand = Math.floor(this.width / bands.length);

    for (let i = 0; i < bands.length; i++) {
      const bandIntensity = bands[i];
      const bandLeds = Math.floor(ledsPerBand * bandIntensity);
      const hue = (baseHue + (i / bands.length) * 360) % 360;
      const { r, g, b } = hueToRGB(hue);
      const color = encodeRGB(r, g, b);

      for (let j = 0; j < ledsPerBand; j++) {
        if (j < bandLeds) {
          colors.push(color);
        } else {
          colors.push(0);
        }
      }
    }

    // Fill remaining LEDs if any
    while (colors.length < this.width) {
      colors.push(0);
    }

    return colors.slice(0, this.width);
  }

  private renderBeatPulse(data: any, time: number): number[] {
    const colors: number[] = [];
    const baseHue = this._colorBaseProperty.value;

    // Pulse effect on beat
    let brightness = data.intensity;
    if (data.beat) {
      brightness = 1.0; // Full brightness on beat
    }

    const { r, g, b } = hueToRGB(baseHue);
    const color = encodeRGB(
      Math.floor(r * brightness),
      Math.floor(g * brightness),
      Math.floor(b * brightness)
    );

    return new Array(this.width).fill(color);
  }

  private renderStyleAdaptive(data: any, time: number): number[] {
    const baseHue = this._colorBaseProperty.value;

    // Adapt colors and patterns based on music style
    switch (data.style) {
      case 'bass_heavy':
        // Deep purple/red for bass-heavy music
        return this.renderIntensityBars({
          ...data,
          intensity: data.bands.bass
        });

      case 'vocal':
        // Warm colors for vocal music
        return this.renderFrequencySpectrum(data);

      case 'bright':
        // Bright colors for bright music
        const brightColors: number[] = [];
        const hue = (baseHue + 180) % 360;
        const { r, g, b } = hueToRGB(hue);
        const brightness = data.intensity;
        const color = encodeRGB(
          Math.floor(r * brightness),
          Math.floor(g * brightness),
          Math.floor(b * brightness)
        );
        return new Array(this.width).fill(color);

      case 'balanced':
        // Standard spectrum for balanced music
        return this.renderFrequencySpectrum(data);

      case 'quiet':
      case 'silence':
        // Dim ambient light
        const dimHue = baseHue;
        const dimColor = hueToRGB(dimHue);
        const dimEncoded = encodeRGB(
          Math.floor(dimColor.r * 0.1),
          Math.floor(dimColor.g * 0.1),
          Math.floor(dimColor.b * 0.1)
        );
        return new Array(this.width).fill(dimEncoded);

      default:
        return this.renderIntensityBars(data);
    }
  }
}
