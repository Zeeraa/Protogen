import { SetPropertyResult } from "./SetPropertyResult";

export abstract class AbstractRgbEffectProperty<T> {
  private _type: string;
  private _name: string;
  private _description: string | null;
  private _value: T;

  constructor(type: string, name: string, defaultValue: T, description: string | null) {
    this._type = type;
    this._name = name;
    this._description = description;
    this._value = defaultValue;
  }

  public get name() {
    return this._name;
  }

  public get type() {
    return this._type;
  }

  get description() {
    return this._description;
  }

  public get value(): T {
    return this._value;
  }

  protected set value(value: T) {
    this._value = value;
  }

  public stringifyValue(): string {
    return String(this.value);
  }

  public abstract set(value: T): SetPropertyResult<T>;

  public abstract setRaw(raw: string): SetPropertyResult<T>;

  public get restrictions() {
    return {};
  }

  public get metadata(): RgbPropertyMetadata {
    return {};
  }
}

interface RgbPropertyMetadata {
  [key: string]: any;
}
