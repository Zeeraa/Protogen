import { ProtoColors } from "../../../../utils/ProtoColors";
import { AbstractRgbEffectProperty } from "../AbstractRgbEffectProperty";
import { SetPropertyResult } from "../SetPropertyResult";

export class RgbEffectColorProperty extends AbstractRgbEffectProperty<number> {
  constructor(name: string, defaultValue: number, description: string | null = null) {
    super("ColorProp", name, defaultValue, description);
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
    if (value < ProtoColors.black) {
      return { success: false, error: "Value below minimum" };
    }

    if (value > ProtoColors.white) {
      return { success: false, error: "Value below maximum" };
    }

    this.value = value;
    return { success: true, property: this };
  }

  public override get restrictions() {
    return {
      min: ProtoColors.black,
      max: ProtoColors.white,
    }
  }
}
