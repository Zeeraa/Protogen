import { ActionType } from "../actions/ActionType";

export class BoopProfileAction {
  private readonly _id: string;
  public triggerAtValue: number;
  public actionType: ActionType;
  public action: string | null;
  public triggerMultipleTimes: boolean;
  public incrementCounterOnFailedCondition: boolean;
  //TODO: implement condition handling

  constructor(
    id: string,
    triggerAtValue: number,
    actionType: ActionType,
    action: string | null,
    triggerMultipleTimes: boolean,
    incrementCounterOnFailedCondition: boolean
  ) {
    this._id = id;
    this.triggerAtValue = triggerAtValue;
    this.actionType = actionType;
    this.action = action;
    this.triggerMultipleTimes = triggerMultipleTimes;
    this.incrementCounterOnFailedCondition = incrementCounterOnFailedCondition;
  }

  public get id(): string {
    return this._id;
  }
}
