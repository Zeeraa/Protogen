import { AbstractRgbEffectProperty, SetPropertyResult } from "../AbstractRgbEffectProperty";

export class RgbEffectBoolProperty extends AbstractRgbEffectProperty<boolean> {
  private _options;

  constructor(name: string, defaultValue: boolean, options: BoolPropOptions) {
    super("BoolProp", name, defaultValue);
    this._options = options;
  }

  public setRaw(raw: string): SetPropertyResult<boolean> {
    const val = String(raw).toLowerCase() == "true";

    return this.set(val);
  }

  public set(value: boolean): SetPropertyResult<boolean> {
    this.value = value;

    return { success: true, property: this };
  }

  public override get metadata() {
    return {
      boolInputType: this._options.inputType || BoolPropInputType.Switch,
      selectTrueText: this._options.selectTrueText,
      selectFalseText: this._options.selectFalseText,
    }
  }
}

interface BoolPropOptions {
  selectTrueText?: string;
  selectFalseText?: string;
  inputType?: BoolPropInputType;
}

export enum BoolPropInputType {
  Switch = "SWITCH",
  Select = "SELECT",
}

export const BoolPropSettingsPresetYesNo: BoolPropOptions = {
  selectTrueText: "Yes",
  selectFalseText: "No",
  inputType: BoolPropInputType.Select,
}