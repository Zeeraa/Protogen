import { BoopProfileAction } from "./BoopProfileAction";
import { BoopSensorManager } from "./BoopSensorManager";

export class BoopProfile {
  private readonly boopSensorManager;
  public readonly id: string;
  public name: string;
  public actions: BoopProfileAction[];
  public resetsAfter: number;
  private _counter: number = 0;
  private _resetAt: number = 0;

  constructor(boopSensorManager: BoopSensorManager, id: string, name: string, actions: BoopProfileAction[], resetsAfter: number) {
    this.boopSensorManager = boopSensorManager;
    this.id = id;
    this.name = name;
    this.actions = actions;
    this.resetsAfter = resetsAfter;
  }

  public onActivate() {
    this.reset();
  }

  public onDeactivate() {
    this.reset();
  }

  public get counter() {
    return this._counter;
  }

  public onBooped() {
    this._counter++;
    this._resetAt = new Date().getTime() + this.resetsAfter * 1000;

  }

  public reset() {
    this._counter = 0;
    this._resetAt = 0;

  }

  public tick() {
    if (this._counter > 0 && new Date().getTime() >= this._resetAt) {
      this.reset();
    }
  }
}
