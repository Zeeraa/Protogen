import { DataSource, Equal } from "typeorm";
import { Protogen } from "../Protogen";
import { SavedVideo } from "./models/video-player/SavedVideos.model";
import { StoredRgbScene } from "./models/rgb/StoredRgbScene.model";
import { RgbSceneEffect } from "./models/rgb/RgbSceneEffect.model";
import { RgbSceneEffectProperty } from "./models/rgb/RgbSceneEffectProperty.model";
import { KVDataStoreEntry } from "./models/data/KVDataStoreEntry.model";

export class Database {
  private _protogen;
  private _dataSource;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._dataSource = new DataSource({
      type: "mysql",
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      username: this.config.username,
      password: this.config.password,
      logging: this.config.logging,
      synchronize: true,
      migrationsTableName: "protogen_typeorm_migrations",
      entities: [
        // ---------- Video manager ----------
        SavedVideo,

        // ---------- RGB ----------
        StoredRgbScene,
        RgbSceneEffect,
        RgbSceneEffectProperty,

        // ---------- Data storage ----------
        KVDataStoreEntry,
      ]
    });
  }

  public get protogen() {
    return this._protogen;
  }

  private get config() {
    return this.protogen.config.database;
  }

  public get dataSource() {
    return this._dataSource;
  }

  public async init() {
    this.protogen.logger.info("Database", "Initializing");
    await this._dataSource.initialize();
    this.protogen.logger.info("Database", "Init complete");
  }

  public async setData(key: string, value: string | null): Promise<KVDataStoreEntry> {
    const repo = this._dataSource.getRepository(KVDataStoreEntry);
    let entry = await repo.findOne({
      where: {
        key: Equal(key),
      },
      select: ["key"],
    });
    if (entry == null) {
      entry = new KVDataStoreEntry();
      entry.key = key;
    }

    entry.value = value;

    return await repo.save(entry);
  }

  public async getData(key: string): Promise<string | null> {
    const repo = this._dataSource.getRepository(KVDataStoreEntry);
    const entry = await repo.findOne({
      where: {
        key: Equal(key),
      },
      select: ["value"],
    });
    return entry == null ? null : entry.value;
  }

  public async hasData(key: string): Promise<boolean> {
    const repo = this._dataSource.getRepository(KVDataStoreEntry);
    const entry = await repo.findOne({
      where: {
        key: Equal(key),
      },
      select: ["key"],
    });
    return entry != null;
  }

  public async deleteData(key: string): Promise<boolean> {
    const repo = this._dataSource.getRepository(KVDataStoreEntry);
    const result = await repo.delete({
      key: Equal(key)
    });
    return result.affected != undefined && result.affected > 0;
  }
}