import { BoopProfileAction } from "./BoopProfileAction";

export class BoopProfile {
  private readonly _id: string;
  public name: string;
  public actions: BoopProfileAction[];
  public resetsAfter: number;

  constructor(id: string, name: string, actions: BoopProfileAction[], resetsAfter: number) {
    this._id = id;
    this.name = name;
    this.actions = actions;
    this.resetsAfter = resetsAfter;
  }

  public get id(): string {
    return this._id;
  }
}
