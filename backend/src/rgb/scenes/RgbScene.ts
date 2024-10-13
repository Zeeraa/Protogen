import { uuidv7 } from "uuidv7";
import { AbstractRgbEffect } from "../effects/AbstractRgbEffect";
import { StaticRgbEffect } from "../effects/implementations/StaticRgbEffect";

export class RgbScene {
  private _id: string;
  private _name: string;
  private _effects: AbstractRgbEffect[];

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
    this._effects = [];

    //TODO: remove
    this._effects.push(new StaticRgbEffect(uuidv7(), "Static", "New effect"));
    this.updateRenderOrder();
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

  public render(originalArray: number[]) {
    const ledCount = originalArray.length;

    this.effects.forEach(effect => {
      const offset = effect.startIndex - 1;
      if (offset >= ledCount) {
        return;
      }

      const newArray = effect.render();

      for (let i = 0; i < newArray.length; i++) {
        if (offset + i < originalArray.length) {
          originalArray[offset + i] = newArray[i];
        }
      }
    });
    //TODO: Implement
  }
}