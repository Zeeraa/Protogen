import { AbstractRgbEffect } from "../effects/AbstractRgbEffect";

export class RgbScene {
  private _id: string;
  private _name: string;
  private _effects: AbstractRgbEffect[];

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
    this._effects = [];
  }

  public get id() {
    return this._id;
  }

  public get name() {
    return this._name;
  }

  public set name(name: string) {
    this._name = name;
  }

  public get effects() {
    return this._effects;
  }

  public updateRenderOrder() {
    this.effects.sort((a, b) => a.renderOrder - b.renderOrder);
  }

  removeEffect(effect: AbstractRgbEffect) {
    this._effects = this.effects.filter(e => e.id != effect.id);
  }

  addEffect(effect: AbstractRgbEffect) {
    this.effects.push(effect);
  }

  public render(originalArray: number[]) {
    const ledCount = originalArray.length;
    const time = Date.now();

    this.effects.forEach(effect => {
      const offset = effect.startIndex - 1;
      if (offset >= ledCount) {
        return;
      }

      const newArray = effect.render(time);

      for (let i = 0; i < newArray.length; i++) {
        if (offset + i < originalArray.length) {
          const val = newArray[i];
          if (val != null) {
            originalArray[offset + i] = val;
          }
        }
      }
    });
  }
}