import { DataSource, EntityManager, Equal } from "typeorm";
import { Protogen } from "../Protogen";
import { SavedVideo } from "./models/video-player/SavedVideos.model";
import { StoredRgbScene } from "./models/rgb/StoredRgbScene.model";
import { RgbSceneEffect } from "./models/rgb/RgbSceneEffect.model";
import { RgbSceneEffectProperty } from "./models/rgb/RgbSceneEffectProperty.model";
import { KVDataStoreEntry } from "./models/data/KVDataStoreEntry.model";
import { RgbEditorPreviewElement } from "./models/rgb/RgbEditorConfig.model";
import { SavedVideoGroup } from "./models/video-player/SavedVideoGroup.model";
import { CustomFace } from "./models/visor/CustomFace.model";
import { User } from "./models/user/User.model";
import { ApiKey } from "./models/apikeys/ApiKey.model";
import { RemoteProfile } from "./models/remote/RemoteProfile.model";
import { RemoteAction } from "./models/remote/RemoteAction.model";

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
        SavedVideoGroup,

        // ---------- RGB ----------
        StoredRgbScene,
        RgbSceneEffect,
        RgbSceneEffectProperty,
        RgbEditorPreviewElement,

        // ---------- Data storage ----------
        KVDataStoreEntry,

        // ---------- Visor ----------
        CustomFace,

        // ---------- Users / Api keys ----------
        User,
        ApiKey,

        // ---------- Remote ----------
        RemoteProfile,
        RemoteAction,
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

  public async setData(key: string, value: string | null, transaction: EntityManager | undefined = undefined): Promise<KVDataStoreEntry> {
    const repo = transaction ? transaction.getRepository(KVDataStoreEntry) : this._dataSource.getRepository(KVDataStoreEntry);
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

  public async initMissingData(key: string, defaultValue: string, transaction: EntityManager | undefined = undefined) {
    if (!await this.hasData(key, transaction)) {
      await this.setData(key, defaultValue, transaction);
    }
  }

  public async getData(key: string, transaction: EntityManager | undefined = undefined): Promise<string | null> {
    const repo = transaction ? transaction.getRepository(KVDataStoreEntry) : this._dataSource.getRepository(KVDataStoreEntry);
    const entry = await repo.findOne({
      where: {
        key: Equal(key),
      },
      select: ["value"],
    });
    return entry == null ? null : entry.value;
  }

  public async hasData(key: string, transaction: EntityManager | undefined = undefined): Promise<boolean> {
    const repo = transaction ? transaction.getRepository(KVDataStoreEntry) : this._dataSource.getRepository(KVDataStoreEntry);
    const entry = await repo.findOne({
      where: {
        key: Equal(key),
      },
      select: ["key"],
    });
    return entry != null;
  }

  public async deleteData(key: string, transaction: EntityManager | undefined = undefined): Promise<boolean> {
    const repo = transaction ? transaction.getRepository(KVDataStoreEntry) : this._dataSource.getRepository(KVDataStoreEntry);
    const result = await repo.delete({
      key: Equal(key)
    });
    return result.affected != undefined && result.affected > 0;
  }
}