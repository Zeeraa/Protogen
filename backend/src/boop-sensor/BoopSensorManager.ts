import { BoopSensorProfile } from "../database/models/boop-sensor/BoopSensorProfile.model";
import { Protogen } from "../Protogen";
import { KV_BoopSensorProfile } from "../utils/KVDataStorageKeys";
import { BoopProfile } from "./BoopProfile";
import { BoopProfileAction } from "./BoopProfileAction";

export class BoopSensorManager {
  private readonly _protogen: Protogen;
  private _profiles: BoopProfile[] = [];
  private _activeProfile: BoopProfile | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  public get protogen() {
    return this._protogen;
  }

  public async init() {
    this._profiles = [];
    this._activeProfile = null;
    this.protogen.logger.info("BoopSensor", "Loading profiles...");
    const repo = this._protogen.database.dataSource.getRepository(BoopSensorProfile);
    const profileData = await repo.find({
      relations: {
        actions: true,
      }
    });
    profileData.forEach(data => {
      const actions: BoopProfileAction[] = [];

      data.actions.forEach(actionData => {
        const action = new BoopProfileAction(
          actionData.id,
          actionData.triggerAtValue,
          actionData.actionType,
          actionData.action,
          actionData.triggerMultipleTimes,
          actionData.incrementCounterOnFailedCondition
        );
        actions.push(action);
      });

      const profile = new BoopProfile(data.id, data.name, actions, data.resetsAfter);
      this._profiles.push(profile);
    });
    this.protogen.logger.info("BoopSensor", this.profiles.length + " profiles loaded");

    const activeProfileId = await this.protogen.database.getData(KV_BoopSensorProfile);
    if (activeProfileId != null) {
      const profile = this._profiles.find(p => p.id === activeProfileId);
      if (profile != null) {
        this._activeProfile = profile;
      } else {
        this.protogen.logger.warn("BoopSensor", "Last active profile not found");
      }
    }
  }

  public async setActiveProfile(profile: BoopProfile | null) {
    this._activeProfile = profile;
    this.protogen.database.setData(KV_BoopSensorProfile, profile?.id ?? null);
  }

  public get profiles(): BoopProfile[] {
    return this._profiles;
  }

  public get activeProfile(): BoopProfile | null {
    return this._activeProfile;
  }
}
