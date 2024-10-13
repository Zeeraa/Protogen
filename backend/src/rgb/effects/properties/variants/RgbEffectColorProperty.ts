import { ProtoColors } from "../../../../utils/ProtoColors";
import { AbstractRgbEffectProperty, SetPropertyResult } from "../AbstractRgbEffectProperty";

export class RgbEffectColorProperty extends AbstractRgbEffectProperty<number> {
  constructor(name: string, defaultValue: number) {
    super("ColorProp", name, defaultValue);
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
    if (value < ProtoColors.black) {
      return { success: false, error: "Value below minimum" };
    }

    if (value > ProtoColors.white) {
      return { success: false, error: "Value below maximum" };
    }

    this.value = value;
    return { success: true };
  }

  public get restrictions() {
    return {
      min: ProtoColors.black,
      max: ProtoColors.white,
    }
  }
}