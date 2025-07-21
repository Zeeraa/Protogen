import { BoopSensorProfile } from "../database/models/boop-sensor/BoopSensorProfile.model";
import { BoopSensorProfileAction } from "../database/models/boop-sensor/BoopSensorProfileAction.model";
import { Protogen } from "../Protogen";
import { KV_BoopCounter, KV_BoopSensorEnabled, KV_BoopSensorProfile, KV_BoopSensorShowOnHud } from "../utils/KVDataStorageKeys";
import { ProtogenEvents } from "../utils/ProtogenEvents";
import { BoopProfile } from "./BoopProfile";
import { BoopProfileAction } from "./BoopProfileAction";

export class BoopSensorManager {
  private readonly _protogen: Protogen;
  private _profiles: BoopProfile[] = [];
  private _activeProfile: BoopProfile | null = null;
  private _lastTriggerTimestamp: number | null = null;
  private _state = false;
  private _enabled = true;
  private _boopCounter = 0;
  private _showOnHud = false;

  constructor(protogen: Protogen) {
    this._protogen = protogen;

    this.protogen.eventEmitter.on(ProtogenEvents.Booped, (state: boolean) => {
      this.handleBoopState(state).then().catch(err => {
        console.error(err);
        this.protogen.logger.error("BoopSensor", "Error handling boop state");
      });
    });

    // Check if the profile should reset
    setInterval(() => {
      this.activeProfile?.tick();
    }, 100);
  }

  public get protogen() {
    return this._protogen;
  }

  public get enabled() {
    return this._enabled;
  }

  public set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.protogen.sensorManager.onBoopSensorDisabled();
    }
  }

  public async setEnabledPersistently(value: boolean) {
    this.enabled = value;
    await this.protogen.database.setData(KV_BoopSensorEnabled, String(value));
  }

  public async toggleEnabled() {
    this.enabled = !this.enabled;
    await this.setEnabledPersistently(this.enabled);
  }

  protected async handleBoopState(state: boolean) {
    // No need to check the enabled value here since its checked by the sensor manager class
    this._lastTriggerTimestamp = new Date().getTime();
    this._state = state;
    if (state == true) {
      this._boopCounter++;
      await this.saveBoopCounter();
      if (this.activeProfile != null) {
        this.activeProfile.onBooped();
      }
    }
  }

  public get state() {
    return this._state;
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
        );
        actions.push(action);
      });

      const profile = new BoopProfile(this, data.id, data.name, actions, data.resetsAfter);
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

    this.protogen.logger.info("BoopSensor", "Loading persistent data...");
    const boopCounterStr = await this.protogen.database.getData(KV_BoopCounter);
    if (boopCounterStr != null) {
      const value = parseInt(boopCounterStr);
      if (isNaN(value)) {
        this.protogen.logger.warn("BoopSensor", "Invalid boop counter value in persistent data, resetting to 0");
        await this.resetBoopCounter();
      } else {
        this._boopCounter = value;
      }
    }

    const enabled = await this.protogen.database.getData(KV_BoopSensorEnabled);
    if (enabled != null) {
      this._enabled = enabled == "true";
    } else {
      // Create the key if it does not exist
      await this.setEnabledPersistently(true);
    }

    const showOnHud = await this.protogen.database.getData(KV_BoopSensorShowOnHud);
    if (showOnHud != null) {
      this._showOnHud = showOnHud == "true";
    }
    else {
      // Create the key if it does not exist
      await this.setShowOnHud(true);
    }
  }

  public async saveProfile(profile: BoopProfile) {
    const repo = this._protogen.database.dataSource.getRepository(BoopSensorProfile);
    let dbProfile = await repo.findOne({
      where: {
        id: profile.id
      },
      relations: {
        actions: true,
      },
    });

    if (dbProfile == null) {
      dbProfile = new BoopSensorProfile();
      dbProfile.id = profile.id;
      dbProfile.actions = [];
    }

    dbProfile.name = profile.name;
    dbProfile.resetsAfter = profile.resetsAfter;

    // Filter out deleted actions
    dbProfile.actions = dbProfile.actions.filter(a => profile.actions.some(pa => pa.id === a.id));

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
    }

    return await repo.save(dbProfile);
  }

  public async setActiveProfile(profile: BoopProfile | null) {
    this._activeProfile?.onDeactivate();
    this._activeProfile = profile;
    this._activeProfile?.onActivate();
    this.protogen.database.setData(KV_BoopSensorProfile, profile?.id ?? null);
  }

  public deleteProfile(profile: BoopProfile) {
    if (this.activeProfile && this.activeProfile.id === profile.id) {
      this.setActiveProfile(null);
    }

    this._profiles = this._profiles.filter(p => p.id !== profile.id);
    const repo = this._protogen.database.dataSource.getRepository(BoopSensorProfile);
    return repo.delete({ id: profile.id });
  }

  public get profiles(): BoopProfile[] {
    return this._profiles;
  }

  public get activeProfile(): BoopProfile | null {
    return this._activeProfile;
  }

  public get boopCounter(): number {
    return this._boopCounter;
  }

  public get showOnHud(): boolean {
    return this._showOnHud;
  }

  public async setShowOnHud(value: boolean) {
    this._showOnHud = value;
    await this.protogen.database.setData(KV_BoopSensorShowOnHud, String(value));
  }

  public async resetBoopCounter() {
    this._boopCounter = 0;
    await this.saveBoopCounter();
  }

  protected async saveBoopCounter() {
    this.protogen.database.setData(KV_BoopCounter, String(this._boopCounter));
  }

  public get data() {
    return {
      lastTrigger: this._lastTriggerTimestamp,
      activeProfileId: this._activeProfile?.id ?? null,
      state: this._state,
      enabled: this.enabled,
      boopCounter: this.boopCounter,
      showOnHud: this.showOnHud,
    }
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
    })),
  };
}
