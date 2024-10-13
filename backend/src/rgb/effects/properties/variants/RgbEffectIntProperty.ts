import { AbstractRgbEffectProperty, SetPropertyResult } from "../AbstractRgbEffectProperty";

export class RgbEffectIntProperty extends AbstractRgbEffectProperty<number> {
  private _options;

  constructor(name: string, defaultValue: number, options: IntPropOptions) {
    super("IntProp", name, defaultValue);
    this._options = options;
  }

  public setRaw(raw: string): SetPropertyResult {
    const intVal = parseInt(raw);
    if (isNaN(intVal)) {
      return {
        success: false,
        error: "Value is NaN",
      }
    }

    return this.set(intVal);
  }

  public set(value: number): SetPropertyResult {
    if (this._options.min !== undefined && value < this._options.min) {
      return { success: false, error: "Value below minimum" };
    }

    if (this._options.max !== undefined && value > this._options.max) {
      return { success: false, error: "Value below maximum" };
    }

    this.value = value;
    return { success: true };
  }

  public get restrictions(): any {
    return {
      min: this._options.min,
      max: this._options.max,
    }
  }
}

interface IntPropOptions {
  min?: number;
  max?: number;
}