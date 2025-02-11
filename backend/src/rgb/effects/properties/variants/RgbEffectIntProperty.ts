import { AbstractRgbEffectProperty } from "../AbstractRgbEffectProperty";
import { SetPropertyResult } from "../SetPropertyResult";

export class RgbEffectIntProperty extends AbstractRgbEffectProperty<number> {
  private _options;

  constructor(name: string, defaultValue: number, options: IntPropOptions, description: string | null = null) {
    super("IntProp", name, defaultValue, description);
    this._options = options;
  }

  public setRaw(raw: string): SetPropertyResult<number> {
    const intVal = parseInt(raw);
    if (isNaN(intVal)) {
      return {
        success: false,
        error: "Value is NaN",
      }
    }

    return this.set(intVal);
  }

  public set(value: number): SetPropertyResult<number> {
    if (this._options.min !== undefined && value < this._options.min) {
      return { success: false, error: "Value below minimum" };
    }

    if (this._options.max !== undefined && value > this._options.max) {
      return { success: false, error: "Value below maximum" };
    }

    this.value = value;
    return { success: true, property: this };
  }

  public override get restrictions(): any {
    return {
      min: this._options.min,
      max: this._options.max,
    }
  }

  public override get metadata() {
    return {
      intInputType: this._options.inputType || IntPropInputType.Default,
    }
  }
}

interface IntPropOptions {
  min?: number;
  max?: number;
  inputType?: IntPropInputType;
}

export enum IntPropInputType {
  Default = "DEFAULT",
  Slider = "SLIDER",
}
