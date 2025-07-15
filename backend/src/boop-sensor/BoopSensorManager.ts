import { BoopSensorProfile } from "../database/models/boop-sensor/BoopSensorProfile.model";
import { BoopSensorProfileAction } from "../database/models/boop-sensor/BoopSensorProfileAction.model";
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

  public async saveProfile(profile: BoopProfile) {
    const repo = this._protogen.database.dataSource.getRepository(BoopSensorProfile);
    let dbProfile = await repo.findOne({
      where: { id: profile.id },
      relations: { actions: true }
    });

    if (dbProfile == null) {
      dbProfile = new BoopSensorProfile();
      dbProfile.id = profile.id;
      dbProfile.actions = [];
    }

    dbProfile.name = profile.name;
    dbProfile.resetsAfter = profile.resetsAfter;

    // Filter out deleted actions
    dbProfile.actions = dbProfile.actions.filter(a => !profile.actions.some(pa => pa.id === a.id));
    for (const action of profile.actions) {
      let dbAction = dbProfile.actions.find(a => a.id === action.id);
      if (dbAction == null) {
        dbAction = new BoopSensorProfileAction();
        dbAction.id = action.id;
        dbProfile.actions.push(dbAction);
      }
      dbAction.triggerAtValue = action.triggerAtValue;
      dbAction.actionType = action.actionType;
      dbAction.action = action.action;
      dbAction.triggerMultipleTimes = action.triggerMultipleTimes;
      dbAction.incrementCounterOnFailedCondition = action.incrementCounterOnFailedCondition;
    }

    return await repo.save(dbProfile);
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

export function boopProfileToDTO(profile: BoopProfile) {
  return {
    id: profile.id,
    name: profile.name,
    resetsAfter: profile.resetsAfter,
    actions: profile.actions.map(action => ({
      id: action.id,
      triggerAtValue: action.triggerAtValue,
      actionType: action.actionType,
      action: action.action,
      triggerMultipleTimes: action.triggerMultipleTimes,
      incrementCounterOnFailedCondition: action.incrementCounterOnFailedCondition
    })),
  };
}
