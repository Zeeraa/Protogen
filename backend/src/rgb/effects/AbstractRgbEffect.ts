import { AbstractRgbEffectProperty, SetPropertyResult } from "./properties/AbstractRgbEffectProperty";
import { RgbEffectIntProperty } from "./properties/RgbEffectIntProperty";

export const DefaultEffectMaxWidth = 2048;

export abstract class AbstractRgbEffect {
  private _id: string;
  private _name: string;
  private _displayName: string;
  private _propertyMap: RgbEffectPropertyMap;
  private _propStartIndex;
  private _propWidth;
  private _propRenderOrder;

  constructor(id: string, name: string, displayName: string) {
    this._id = id;
    this._name = name;
    this._displayName = displayName;
    this._propertyMap = {};
    this._propStartIndex = new RgbEffectIntProperty("StartIndex", 1, { min: 1, max: 2147483647 });
    this._propWidth = new RgbEffectIntProperty("EffectWidth", 1, { min: 1, max: DefaultEffectMaxWidth });
    this._propRenderOrder = new RgbEffectIntProperty("RenderOrder", 1, { min: -2147483648, max: 2147483647 });

    // Default properties
    this.addProperty(this._propStartIndex);
    this.addProperty(this._propWidth);
    this.addProperty(this._propRenderOrder);
  }

  public abstract render(): number[];

  public get id() {
    return this._id;
  }

  public get name() {
    return this._name;
  }

  protected addProperty(prop: AbstractRgbEffectProperty<any>) {
    if (this._propertyMap[prop.name] !== undefined) {
      throw new Error("Tried to add property named " + prop.name + " but there was already a property with that name");
    }
    this._propertyMap[prop.name] = prop;
  }

  public get propertyMap() {
    return this._propertyMap;
  }

  public getProperty(key: string): any | undefined {
    return this._propertyMap[key];
  }

  public setProperty(key: string, value: string): SetPropertyResult {
    if (this._propertyMap[key] == null) {
      return { success: false, error: "Could not find property " + key }
    }
    return this._propertyMap[key].setRaw(value);
  }

  public get width() {
    return this._propWidth.value;
  }

  public get renderOrder() {
    return this._propRenderOrder.value;
  }

  public get startIndex() {
    return this._propStartIndex.value;
  }

  public get displayName() {
    return this._displayName;
  }

  public set displayName(displayName: string) {
    this._displayName = displayName;
  }
}

interface RgbEffectPropertyMap {
  [key: string]: AbstractRgbEffectProperty<any>;
}