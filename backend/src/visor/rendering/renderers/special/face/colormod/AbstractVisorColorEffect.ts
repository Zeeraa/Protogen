import { AbstractRgbEffectProperty } from "../../../../../../rgb/effects/properties/AbstractRgbEffectProperty";
import { RgbEffectPropertyMap } from "../../../../../../rgb/effects/properties/RgbEffectPropertyMap";
import { SetPropertyResult } from "../../../../../../rgb/effects/properties/SetPropertyResult";

export abstract class AbstractVisorColorEffect {
  private _id: string;
  private _effectName: string;
  private _displayName: string;
  private _propertyMap: RgbEffectPropertyMap;

  constructor(id: string, effectName: string, displayName: string) {
    this._id = id;
    this._effectName = effectName;
    this._displayName = displayName;
    this._propertyMap = {};
  }

  public get id() {
    return this._id;
  }

  public get effectName() {
    return this._effectName;
  }

  public get displayName() {
    return this._displayName;
  }

  public set displayName(value: string) {
    this._displayName = value;
  }

  protected addProperty<T>(prop: AbstractRgbEffectProperty<T>): AbstractRgbEffectProperty<T> {
    if (this._propertyMap[prop.name] !== undefined) {
      throw new Error("Tried to add property named " + prop.name + " but there was already a property with that name");
    }
    this._propertyMap[prop.name] = prop;
    return prop;
  }

  public get propertyMap() {
    return this._propertyMap;
  }

  public getProperty(key: string): any | undefined {
    return this._propertyMap[key];
  }

  public setProperty(key: string, value: string): SetPropertyResult<any> {
    if (this._propertyMap[key] == null) {
      return { success: false, error: "Could not find property " + key }
    }
    return this._propertyMap[key].setRaw(value);
  }

  /**
   * Change the pixel values in the data array to adjust colors. The provided array should be modified to adjust colors
   * @param data Array of pixel values
   * @param width The width of the image
   * @param height The height of the image
   * @param time Time in milliseconds
   */
  public abstract apply(data: number[], width: number, height: number, time: number): void;

  /**
   * This gets called 20 times per second if the effect is active
   */
  public onFixedTickRate(): void { }
}
