import { Equal } from "typeorm";
import { StoredRgbScene } from "../database/models/rgb/StoredRgbScene.model";
import { Protogen } from "../Protogen";
import { RgbScene } from "./scenes/RgbScene";
import { uuidv7 } from "uuidv7";
import { ProtoColors } from "../utils/ProtoColors";
import { RgbSceneEffect } from "../database/models/rgb/RgbSceneEffect.model";
import { RgbSceneEffectProperty } from "../database/models/rgb/RgbSceneEffectProperty.model";
import { constructRgbEffect } from "./effects/RgbEffects";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";
import { KV_LastUsedRgbScene, KV_RbgPreviewWidth, KV_RgbPreviewFullSizeOnLargeViewports, KV_RgbPreviewHeigth } from "../utils/KVDataStorageKeys";
import { cyan } from "colors";

/**
 * Manages RGB scenes and effects.
 */
export class RgbManager {
  private _protogen;
  private _ledBuffer: number[];
  private _scenes: RgbScene[];
  private _activeScene: RgbScene | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._ledBuffer = [];
    this._scenes = [];
    for (let i = 0; i < this.config.ledCount; i++) {
      this._ledBuffer.push(ProtoColors.black);
    }

    if (this.config.refreshRate > 0) {
      setInterval(() => {
        this.tick();
      }, 1000 / this.config.refreshRate);
    } else {
      protogen.logger.warn("RGB", "Refresh rate set to 0. RGB Animations disabled")
    }
  }

  private get protogen() {
    return this._protogen;
  }

  private get config() {
    return this.protogen.config.rgb;
  }

  /**
   * Initializes the RGB manager and fetches data from the database.
   */
  public async init() {
    this.protogen.database.initMissingData(KV_RbgPreviewWidth, "720");
    this.protogen.database.initMissingData(KV_RgbPreviewHeigth, "400");
    this.protogen.database.initMissingData(KV_RgbPreviewFullSizeOnLargeViewports, "false");
  }

  /**
   * Get the led count for the addressable RGB strip.
   * @returns The number of LEDs in the RGB strip.
   */
  public get ledCount() {
    return this.config.ledCount;
  }

  /**
   * Called on a schedule to update the RGB strip.
   */
  public tick() {
    for (let i = 0; i < this._ledBuffer.length; i++) {
      this._ledBuffer[i] = ProtoColors.black;
    }

    if (this.activeScene != null) {
      this.activeScene.render(this._ledBuffer);
    }
    this.send();
  }

  /**
   * Get the active rgb scene.
   */
  public get activeScene() {
    return this._activeScene;
  }

  /**
   * Apply the last used RGB scene from the database.
   * If no last used scene is found, it will return true without applying anything.
   * @returns true if a scene was applied or false if an error occurred.
   */
  public async applyLastScene() {
    this.protogen.logger.info("RGB", "Fetching last used RGB scene");
    try {
      const id = await this.protogen.database.getData(KV_LastUsedRgbScene);
      if (id != null) {
        const scene = await this.scenes.find(s => s.id == id);
        if (scene != null) {
          this.setActiveScene(scene, false);
          this.protogen.logger.info("RGB", "Activating last used scene " + scene.name);
        } else {
          this.protogen.logger.warn("RGB", "Last used scene was no longer found");
        }
      } else {
        this.protogen.logger.info("RGB", "No value for last used scene");
      }
      return true;
    } catch (_err) { }
    return false;
  }

  /**
   * Saves the last used RGB scene to the database.
   * @returns true if the scene was saved successfully, false if an error occurred.
   */
  public async saveLastUsedScene() {
    try {
      const value = this.activeScene == null ? null : this.activeScene.id;
      await this.protogen.database.setData(KV_LastUsedRgbScene, value);
      return true;
    } catch (err) {
      this.protogen.logger.error("RGB", "Failed to set  last used scene");
      console.error(err);
    }
  }

  /**
   * Sets the active RGB scene.
   * If the scene is null, it will disable the RGB scene.
   * @param scene The scene to activate.
   * @param updateDatabase Whether to update the database with the last used scene.
   */
  public setActiveScene(scene: RgbScene | null, updateDatabase = true) {
    if (scene != null) {
      this.protogen.logger.info("RGB", "Activating RGB scene " + cyan(scene.name));
    } else {
      this.protogen.logger.info("RGB", "Disabling rgb scene");
    }
    this._activeScene = scene;
    if (updateDatabase) {
      this.saveLastUsedScene();
    }
  }

  /**
   * Send the led frame buffer to the RGB strip and all connected clients.
   */
  private send() {
    if (this._ledBuffer.length == 0) {
      return; // Cant send an empty rgb packet
    }

    this.protogen.webServer.socketSessions.filter(s => s.enableRgbPreview).forEach(socket => {
      socket.sendMessage(SocketMessageType.S2C_RgbPreview, {
        leds: this._ledBuffer,
      });
    })

    this.protogen.hardwareAbstractionLayer.writeLedData(this._ledBuffer);
  }

  /**
   * Loads all RGB scenes from the database and constructs them.
   */
  public async loadScenes() {
    this.protogen.logger.info("RgbManager", "Loading scenes...")
    this._scenes = [];
    const repo = this.protogen.database.dataSource.getRepository(StoredRgbScene);

    const scenes = await repo.find({
      relations: ["effects", "effects.properties"]
    });

    scenes.forEach(scene => {
      const loadedScene = new RgbScene(scene.id, scene.name);

      scene.effects.forEach(effect => {
        const loadedEffect = constructRgbEffect(effect.effect, effect.displayName, effect.id, this.protogen);
        if (loadedEffect == null) {
          this.protogen.logger.error("RgbManager", "Failed to load RGB effect by name " + effect.effect);
          return;
        }

        effect.properties.forEach(prop => {
          const result = loadedEffect.setProperty(prop.key, prop.value);
          if (!result.success) {
            this.protogen.logger.warn("RgbManager", "Tried to set property " + prop.key + " of effect " + effect.effect + " to " + prop.value + " but got error " + result.error);
          }
        });

        loadedScene.effects.push(loadedEffect);
      });

      loadedScene.updateRenderOrder();
      this._scenes.push(loadedScene);
    });
    this.protogen.logger.info("RgbManager", this.scenes.length + " scenes loaded");
  }

  /**
   * Saves the RGB scene to the database.
   * @param scene The scene to save.
   * @returns true if the scene was saved successfully, false if an error occurred.
   */
  public async saveScene(scene: RgbScene) {
    const repo = this.protogen.database.dataSource.getRepository(StoredRgbScene);
    const existing = await repo.findOne({
      where: {
        id: Equal(scene.id),
      },
      relations: ["effects", "effects.properties"]
    });

    let dbScene;
    if (existing != null) {
      dbScene = existing;
    } else {
      dbScene = new StoredRgbScene();
      dbScene.id = scene.id;
      dbScene.effects = [];
    }

    dbScene.name = scene.name;

    // Remove any deleted effects
    dbScene.effects = dbScene.effects.filter(se => scene.effects.find(e => e.id == se.id) != null);

    scene.effects.forEach(effect => {
      let dbEffect = dbScene.effects.find(e => e.id == effect.id);
      if (dbEffect == null) {
        dbEffect = new RgbSceneEffect();
        dbEffect.id = effect.id;
        dbEffect.properties = [];
        dbScene.effects.push(dbEffect);
      }

      dbEffect.displayName = effect.displayName;
      dbEffect.effect = effect.name;

      Object.values(effect.propertyMap).forEach(prop => {
        let dbProp = dbEffect.properties.find(p => p.key == prop.name);
        if (dbProp == null) {
          dbProp = new RgbSceneEffectProperty();
          dbProp.key = prop.name;
          dbEffect.properties.push(dbProp);
        }
        dbProp.value = prop.stringifyValue();
      });
    });

    return await repo.save(dbScene);
  }

  /**
   * Create a new blank RGB scene.
   * @param name The name of the scene.
   * @returns The created scene.
   */
  public async createBlankScene(name: string) {
    const scene = new RgbScene(uuidv7(), name);
    await this.saveScene(scene);
    this.scenes.push(scene);
    return scene;
  }

  /**
   * Deletes an RGB scene.
   * @param scene The scene to delete.
   */
  public async deleteScene(scene: RgbScene) {
    if (this.activeScene?.id == scene.id) {
      this._activeScene = null;
    }
    const repo = this.protogen.database.dataSource.getRepository(StoredRgbScene);
    const entity = await repo.findOne({
      where: {
        id: Equal(scene.id)
      }
    });

    if (entity != null) {
      await repo.remove(entity);
    }

    this._scenes = this._scenes.filter(s => s.id != scene.id);
  }

  /**
   * Get all available RGB scenes.
   * @returns An array of RgbScene objects.
   */
  public get scenes() {
    return this._scenes;
  }
}
