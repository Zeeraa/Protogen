import { ActionType } from "../actions/ActionType";

export class BoopProfileAction {
  private readonly _id: string;
  public triggerAtValue: number;
  public actionType: ActionType;
  public action: string | null;
  public triggerMultipleTimes: boolean;
  public metadata: string | null;
  public didRun = false;

  constructor(
    id: string,
    triggerAtValue: number,
    actionType: ActionType,
    action: string | null,
    metadata: string | null,
    triggerMultipleTimes: boolean,
  ) {
    this._id = id;
    this.triggerAtValue = triggerAtValue;
    this.actionType = actionType;
    this.action = action;
    this.metadata = metadata;
    this.triggerMultipleTimes = triggerMultipleTimes;
  }

  public get id(): string {
    return this._id;
  }
}
