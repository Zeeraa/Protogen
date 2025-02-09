import { AbstractRgbEffectProperty } from "../../../../../../rgb/effects/properties/AbstractRgbEffectProperty";
import { RgbEffectPropertyMap } from "../../../../../../rgb/effects/properties/RgbEffectPropertyMap";
import { SetPropertyResult } from "../../../../../../rgb/effects/properties/SetPropertyResult";

export abstract class AbstractColorMod {
  private _id: string;
  private _name: string;
  private _propertyMap: RgbEffectPropertyMap;

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
    this._propertyMap = {};
  }

  public get id() {
    return this._id;
  }

  public get name() {
    return this._name;
  }

  protected set name(value: string) {
    this._name = value;
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
}
