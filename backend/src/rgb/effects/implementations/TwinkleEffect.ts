import { Protogen } from "../../../Protogen";
import { hueToRGB, ProtoColors, RGBColor } from "../../../utils/ProtoColors";
import { decodeRGB, encodeRGBObject } from "../../../utils/Utils";
import { AbstractRgbEffect } from "../AbstractRgbEffect";
import { BoolPropInputType, RgbEffectBoolProperty } from "../properties/variants/RgbEffectBoolProperty";
import { RgbEffectColorProperty } from "../properties/variants/RgbEffectColorProperty";
import { IntPropInputType, RgbEffectIntProperty } from "../properties/variants/RgbEffectIntProperty";

export class TwinkleEffect extends AbstractRgbEffect {
  private _propColor;
  private _propUseRandomColor;
  private _propFadeSpeed;
  private _propPixelSpawnSpeed;
  private _propMaxPixelsSpawnedPerTick;
  private _propMaxPixelCount;
  private _lastTick;
  private _lastSpawnTick;

  private _pixelArray: TwinklePixel[] = [];

  constructor(id: string, name: string, displayName: string, protogen: Protogen) {
    super(id, name, displayName, protogen);
    this._propColor = new RgbEffectColorProperty("Color", ProtoColors.white, "Color to use");
    this._propUseRandomColor = new RgbEffectBoolProperty("UseRandomColor", false, { inputType: BoolPropInputType.Switch }, "Use a random colors");
    this._propFadeSpeed = new RgbEffectIntProperty("FadeSpeed", 130, { min: 1, max: 500, inputType: IntPropInputType.Slider }, "Speed of the fade effect");
    this._propPixelSpawnSpeed = new RgbEffectIntProperty("PixelSpawnSpeed", 300, { min: 1, max: 1000, inputType: IntPropInputType.Slider }, "Speed that pixels will try to spawn at");
    this._propMaxPixelsSpawnedPerTick = new RgbEffectIntProperty("MaxPixelsPerSpawnTick", 1, { min: 1, max: 10 }, "Max amount of pixels to spawn during each spawn tick");
    this._propMaxPixelCount = new RgbEffectIntProperty("MaxPixels", 10, { min: 1, max: 1024 }, "Max pixels to show at the same time");

    this.addProperty(this._propColor);
    this.addProperty(this._propUseRandomColor);
    this.addProperty(this._propFadeSpeed);
    this.addProperty(this._propPixelSpawnSpeed);
    this.addProperty(this._propMaxPixelsSpawnedPerTick);
    this.addProperty(this._propMaxPixelCount);

    this._lastTick = 0;
    this._lastSpawnTick = 0;
  }

  public render(time: number): (number | null)[] {
    if (this._lastTick == 0) {
      this._lastTick = time;
    }
    const deltaTime = time - this._lastTick;
    this._lastTick = time;

    const leds: (number | null)[] = [];
    for (let i = 0; i < this.width; i++) {
      leds[i] = null;
    }

    const clampedMaxPixels = this._propMaxPixelCount.value > this.width ? this.width : this._propMaxPixelCount.value;
    const alteredFadeSpeed = this._propFadeSpeed.value / 50;

    if (time - this._lastSpawnTick > this._propPixelSpawnSpeed.value) {
      this._lastSpawnTick = time;
      const trySpawnCount = Math.floor(Math.random() * this._propMaxPixelsSpawnedPerTick.value) + 1;
      for (let i = 0; i < trySpawnCount; i++) {
        if (this._pixelArray.length >= clampedMaxPixels) {
          break;
        }

        let position: number | null = null;

        // Make up to 50 attemts to find a free pixel
        for (let j = 0; j < 50; j++) {
          const randomPosition = Math.floor(Math.random() * this.width);
          if (this._pixelArray.find(p => p.position == randomPosition) == null) {
            position = randomPosition;
            break;
          }
        }

        if (position != null) {
          const randomColor = this._propUseRandomColor.value ? null : this._propColor.value;
          this._pixelArray.push(new TwinklePixel(position, randomColor));
        }
      }
    }

    this._pixelArray = this._pixelArray.filter(p => !p.isDead);
    this._pixelArray.forEach(p => {
      p.tick(deltaTime, alteredFadeSpeed);
      if (p.position >= leds.length) {
        return;
      }
      leds[p.position] = encodeRGBObject(p.rgbColor);
    });

    return leds;
  }
}

class TwinklePixel {
  public readonly position: number;
  private readonly _targetColorRgb: RGBColor;
  private _brightness: number;
  private _fadeOutStarted: boolean;
  private _isDead: boolean;

  constructor(position: number, targetColor: number | null) {
    this.position = position;
    if (targetColor == null) {
      const randomHue = Math.floor(Math.random() * 360);
      this._targetColorRgb = hueToRGB(randomHue);
    } else {
      this._targetColorRgb = decodeRGB(targetColor);
    }
    this._brightness = 0;
    this._fadeOutStarted = false;
    this._isDead = false;
  }

  public get isDead() {
    return this._isDead;
  }

  tick(deltaTime: number, targetSpeed: number) {
    const sencondsSinceLastTick = deltaTime / 1000;
    if (this._fadeOutStarted) {
      this._brightness -= sencondsSinceLastTick * targetSpeed;
      if (this._brightness <= 0) {
        this._isDead = true;
      }
    } else {
      this._brightness += sencondsSinceLastTick * targetSpeed;
      if (this._brightness >= 1) {
        this._fadeOutStarted = true;
        this._brightness = 1;
      }
    }
  }

  public get rgbColor(): RGBColor {
    const r = Math.floor(this._targetColorRgb.r * this._brightness);
    const g = Math.floor(this._targetColorRgb.g * this._brightness);
    const b = Math.floor(this._targetColorRgb.b * this._brightness);
    return { r, g, b };
  }
}
