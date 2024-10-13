import { Equal } from "typeorm";
import { StoredRgbScene } from "../database/models/rgb/StoredRgbScene.model";
import { Protogen } from "../Protogen";
import { RgbScene } from "./scenes/RgbScene";
import { uuidv7 } from "uuidv7";
import { ProtoColors } from "../utils/ProtoColors";

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

  public get ledCount() {
    return this.config.ledCount;
  }

  public tick() {
    if (this.activeScene != null) {
      this.activeScene.render(this._ledBuffer);
    }
    this.send();
  }

  public get activeScene() {
    return this._activeScene;
  }

  private send() {
    if (this._ledBuffer.length == 0) {
      return; // Cant send an empty rgb packet
    }
    const data = "RGB:" + this._ledBuffer.join(",");
    this.protogen.serial.write(data);
  }

  public async loadScenes() {
    this.protogen.logger.info("RgbManager", "Loading scenes...")
    this._scenes = [];
    const repo = this.protogen.database.dataSource.getRepository(StoredRgbScene);

    const scenes = await repo.find({
      relations: ["effects", "effects.properties"]
    });

    scenes.forEach(scene => {
      const loadedScene = new RgbScene(scene.id, scene.name);
      this._scenes.push(loadedScene);
    });
    this.protogen.logger.info("RgbManager", this.scenes.length + " scenes loaded");

    if (this._scenes.length > 0) {
      this._activeScene = this._scenes[0];//TODO: remove
    }
  }

  public async saveScene(scene: RgbScene) {
    const repo = this.protogen.database.dataSource.getRepository(StoredRgbScene);
    const existing = await repo.findOne({
      where: {
        id: Equal(scene.id),
      },
      relations: ["effects", "effects.properties"]
    });

    let savedScene;
    if (existing != null) {
      savedScene = existing;
    } else {
      savedScene = new StoredRgbScene();
      savedScene.id = scene.id;
      savedScene.name = scene.name;
    }

    return await repo.save(savedScene);
  }

  public async createBlankScene(name: string) {
    const scene = new RgbScene(uuidv7(), name);
    await this.saveScene(scene);
    this.scenes.push(scene);
    return scene;
  }

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

  public get scenes() {
    return this._scenes;
  }
}