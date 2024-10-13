export abstract class AbstractRgbEffectProperty<T> {
  private _type: string;
  private _name: string;
  private _value: T;

  constructor(type: string, name: string, defaultValue: T) {
    this._type = type;
    this._name = name;
    this._value = defaultValue;
  }

  public get name() {
    return this._name;
  }

  public get type() {
    return this._type;
  }

  public get value(): T {
    return this._value;
  }

  protected set value(value: T) {
    this._value = value;
  }

  public abstract set(value: T): SetPropertyResult;

  public abstract setRaw(raw: string): SetPropertyResult;

  public abstract get restrictions(): any;
}

export type SetPropertyResult = | { success: true } | { success: false; error: string };