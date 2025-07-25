import { cyan } from "colors";
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

  /**
   * Called when the profile is activated.
   */
  public onActivate() {
    this.reset();
  }

  /**
   * Called when the profile is deactivated.
   */
  public onDeactivate() {
    this.reset();
  }

  /**
   * Returns the current value of the profile's counter.
   */
  public get counter() {
    return this._counter;
  }

  /**
   * Called when the touch sensor is activated
   */
  public async onBooped() {
    this._counter++;
    this._resetAt = new Date().getTime() + this.resetsAfter * 1000;

    const action = this.actions
      .filter(action => action.triggerAtValue <= this._counter)
      .sort((a, b) => b.triggerAtValue - a.triggerAtValue)[0] ?? null;

    if (action != null) {
      if (action.didRun && !action.triggerMultipleTimes) {
        return;
      }

      this.boopSensorManager.protogen.logger.info("BoopSensor", `Boop profile ${cyan(this.name)} triggered action ${cyan(action.actionType)} with data ${cyan(action.action ?? "null")} at value ${cyan(String(this._counter))}`);
      await this.boopSensorManager.protogen.actionManager.performAction(action.actionType, action.action, action.metadata);
      action.didRun = true;
    }
  }

  /**
   * Resets the profile's counter and actions.
   */
  public reset() {
    this._counter = 0;
    this._resetAt = 0;
    this.actions.forEach(action => {
      action.didRun = false;
    });
  }

  /**
   * Called on a schedule to reset the profile if the reset time has passed.
   */
  public tick() {
    if (this._counter > 0 && new Date().getTime() >= this._resetAt) {
      this.reset();
    }
  }
}
