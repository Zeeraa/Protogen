import { uuidv4 } from "uuidv7";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { resolve } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { cp, rm } from "fs/promises";
import { rimrafSync } from "rimraf";
import { execFile } from "child_process";
import { promisify } from "util";
import fileUpload from "express-fileupload";
import { Request, Response } from "express";
import { KVDataStoreEntry } from "../../../database/models/data/KVDataStoreEntry.model";
import { ActionSet } from "../../../database/models/actions/ActionSet.model";
import { ActionSetAction } from "../../../database/models/actions/ActionSetEntry.model";
import { ApiKey } from "../../../database/models/apikeys/ApiKey.model";
import { User } from "../../../database/models/auth/User.model";
import { BoopSensorProfile } from "../../../database/models/boop-sensor/BoopSensorProfile.model";
import { BoopSensorProfileAction } from "../../../database/models/boop-sensor/BoopSensorProfileAction.model";
import { GamepadProfile } from "../../../database/models/gamepad/GamepadProfile.model";
import { GamepadProfileAction } from "../../../database/models/gamepad/GamepadProfileAction.model";
import { StoredRgbScene } from "../../../database/models/rgb/StoredRgbScene.model";
import { RgbSceneEffect } from "../../../database/models/rgb/RgbSceneEffect.model";
import { RgbSceneEffectProperty } from "../../../database/models/rgb/RgbSceneEffectProperty.model";
import { RgbEditorPreviewElement } from "../../../database/models/rgb/RgbEditorConfig.model";
import { SavedVideoGroup } from "../../../database/models/video-player/SavedVideoGroup.model";
import { SavedVideo } from "../../../database/models/video-player/SavedVideos.model";
import { VideoCache } from "../../../database/models/video-player/VideoCache.model";
import { CustomFace } from "../../../database/models/visor/CustomFace.model";
import { FaceExpressionData } from "../../../database/models/visor/FaceExpression.model";
import { FaceColorEffect } from "../../../database/models/visor/FaceColorEffect";
import { FaceColorEffectProperty } from "../../../database/models/visor/FaceColorEffectProperty";

const execFileAsync = promisify(execFile);

export class BackupRouter extends AbstractRouter {
  private pendingDownloadTokens = new Map<string, { expires: number }>();

  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/backup");

    setInterval(() => {
      const now = Date.now();
      for (const [token, info] of this.pendingDownloadTokens.entries()) {
        if (info.expires < now) {
          this.pendingDownloadTokens.delete(token);
        }
      }
    }, 60 * 1000); // Cleanup every minute

    this.router.get("/get-download-token", this.authMiddleware, async (req, res) => {
      /*
      #swagger.path = '/backup/get-download-token'
      #swagger.tags = ['Backup']
      #swagger.description = "Issue a short-lived one-time token for downloading a backup archive"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[403] = { description: "Forbidden" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      if (req.auth.isSuperUser !== true) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const token = uuidv4();
      this.pendingDownloadTokens.set(token, { expires: Date.now() + 30 * 1000 }); // Token valid for 30 seconds
      res.json({ token });
    });

    this.router.get("/download", async (req, res) => {
      /*
      #swagger.path = '/backup/download'
      #swagger.tags = ['Backup']
      #swagger.description = "Download a backup archive using a one-time token obtained from /backup/get-download-token"
      #swagger.parameters['token'] = { in: 'query', description: 'One-time download token', required: true, type: 'string' }
      #swagger.responses[200] = { description: "Backup archive file" }
      #swagger.responses[403] = { description: "Invalid or expired token" }
      */
      try {
        const token = req.query.token;
        if (typeof token !== "string" || !this.pendingDownloadTokens.has(token)) {
          res.status(403).json({ error: "Invalid or expired token" });
          return;
        }

        const tokenInfo = this.pendingDownloadTokens.get(token);
        if (!tokenInfo || tokenInfo.expires < Date.now()) {
          this.pendingDownloadTokens.delete(token);
          res.status(403).json({ error: "Invalid or expired token" });
          return;
        }

        this.pendingDownloadTokens.delete(token);

        // Setup temp data dir
        const tempDirectory = resolve(this.protogen.tempDirectory, uuidv4());
        mkdirSync(tempDirectory, { recursive: true });

        // Copy media
        const imageDirectory = resolve(tempDirectory, "images");
        const videoDirectory = resolve(tempDirectory, "videos");
        await cp(this.protogen.imageDirectory, imageDirectory, { recursive: true });
        await cp(this.protogen.videoDirectory, videoDirectory, { recursive: true });

        // Export database
        {
          const kvDataStoreRepo = this.protogen.database.dataSource.getRepository(KVDataStoreEntry);
          const allEntries = await kvDataStoreRepo.find();
          writeFileSync(resolve(tempDirectory, "config.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const actionsRepo = this.protogen.database.dataSource.getRepository(ActionSet);
          const allEntries = await actionsRepo.find({ relations: { actions: true } });
          writeFileSync(resolve(tempDirectory, "actions.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const apiKeysRepo = this.protogen.database.dataSource.getRepository(ApiKey);
          const allEntries = await apiKeysRepo.find();
          writeFileSync(resolve(tempDirectory, "api_keys.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const userRepo = this.protogen.database.dataSource.getRepository(User);
          const allEntries = await userRepo.find();
          writeFileSync(resolve(tempDirectory, "users.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const boopSensorRepo = this.protogen.database.dataSource.getRepository(BoopSensorProfile);
          const allEntries = await boopSensorRepo.find({ relations: { actions: true } });
          writeFileSync(resolve(tempDirectory, "boop_sensor_profiles.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const gamepadRepo = this.protogen.database.dataSource.getRepository(GamepadProfile);
          const allEntries = await gamepadRepo.find({ relations: { actions: true } });
          writeFileSync(resolve(tempDirectory, "gamepad_profiles.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const rgbRepo = this.protogen.database.dataSource.getRepository(StoredRgbScene);
          const allEntries = await rgbRepo.find({ relations: { effects: { properties: true } } });
          writeFileSync(resolve(tempDirectory, "rgb_scenes.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const rgbEditorSettingsRepo = this.protogen.database.dataSource.getRepository(RgbEditorPreviewElement);
          const allEntries = await rgbEditorSettingsRepo.find();
          writeFileSync(resolve(tempDirectory, "rgb_editor_config.json"), JSON.stringify(allEntries, null, 2));
        }

        {
          const videoGroupsRepo = this.protogen.database.dataSource.getRepository(SavedVideoGroup);
          const groups = await videoGroupsRepo.find();

          const savedVideoRepo = this.protogen.database.dataSource.getRepository(SavedVideo);
          const allVideos = await savedVideoRepo.find({ relations: { group: true } });

          const videoCacheRepo = this.protogen.database.dataSource.getRepository(VideoCache);
          const cacheEntries = await videoCacheRepo.find();

          const data = {
            groups: groups,
            videos: allVideos.map(v => ({
              id: v.id,
              sortingNumber: v.sortingNumber,
              name: v.name,
              url: v.url,
              mirrorVideo: v.mirrorVideo,
              flipVideo: v.flipVideo,
              isStream: v.isStream,
              hideUrl: v.hideUrl,
              groupId: v.group?.id ?? null,
            })),
            cache: cacheEntries,
          };

          writeFileSync(resolve(tempDirectory, "video_player_data.json"), JSON.stringify(data, null, 2));
        }

        {
          const customFacesRepo = this.protogen.database.dataSource.getRepository(CustomFace);
          const faces = await customFacesRepo.find();

          const expressionRepo = this.protogen.database.dataSource.getRepository(FaceExpressionData);
          const expressions = await expressionRepo.find({ relations: { linkedColorEffect: true } });

          const colorEffectsRepo = this.protogen.database.dataSource.getRepository(FaceColorEffect);
          const colorEffects = await colorEffectsRepo.find({ relations: { properties: true } });

          const data = { faces, expressions, colorEffects };
          writeFileSync(resolve(tempDirectory, "visor_data.json"), JSON.stringify(data, null, 2));
        }


        // Compress and send files
        const tempArchive = resolve(this.protogen.tempDirectory, uuidv4() + ".tar.gz");

        await execFileAsync("tar", ["-czf", tempArchive, "-C", tempDirectory, "."]);

        rimrafSync(tempDirectory);

        const filename = `protogen-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
        res.download(tempArchive, filename);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/import", [
      this.authMiddleware,
      fileUpload({
        useTempFiles: true,
        tempFileDir: this.protogen.tempDirectory,
      })
    ], async (req: Request, res: Response) => {
      /*
      #swagger.path = '/backup/import'
      #swagger.tags = ['Backup']
      #swagger.description = "Import a backup archive"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request" }
      #swagger.responses[403] = { description: "Forbidden" }
      #swagger.security = [
        {"apiKeyAuth": []},
        {"tokenAuth": []}
      ]
      */
      try {
        if (req.auth.isSuperUser !== true) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }

        if (!req.files?.file) {
          res.status(400).json({ error: "No file named \"file\" was uploaded" });
          return;
        }

        const file = req.files.file as fileUpload.UploadedFile;
        const id = uuidv4();
        const archivePath = resolve(this.protogen.tempDirectory, id + ".tar.gz");
        const extractDir = resolve(this.protogen.tempDirectory, id);

        await file.mv(archivePath);

        try {
          await execFileAsync("tar", ["-tzf", archivePath]);
        } catch {
          await rm(archivePath, { force: true }).catch(() => undefined);
          res.status(400).json({ error: "Invalid or corrupt tar.gz archive" });
          return;
        }

        mkdirSync(extractDir, { recursive: true });
        await execFileAsync("tar", ["-xzf", archivePath, "-C", extractDir]);

        this.protogen.logger.info("Backup", "Starting import of backup archive");

        await this.protogen.database.dataSource.transaction(async transactionalEntityManager => {
          // KV config
          {
            const path = resolve(extractDir, "config.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing config (KV data store)");
              const configData = JSON.parse(readFileSync(path, "utf-8"));
              const repo = transactionalEntityManager.getRepository(KVDataStoreEntry);
              await repo.createQueryBuilder().delete().execute();
              for (const entry of configData) {
                const dbEntry = new KVDataStoreEntry();
                dbEntry.key = entry.key;
                dbEntry.value = entry.value;
                await repo.save(dbEntry);
              }
            }
          }

          // Action sets
          {
            const path = resolve(extractDir, "actions.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing action sets");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const actionSetRepo = transactionalEntityManager.getRepository(ActionSet);
              const actionRepo = transactionalEntityManager.getRepository(ActionSetAction);
              await actionRepo.createQueryBuilder().delete().execute();
              await actionSetRepo.createQueryBuilder().delete().execute();
              for (const entry of data) {
                const actionSet = new ActionSet();
                actionSet.id = entry.id;
                actionSet.name = entry.name;
                actionSet.showOnDashboard = entry.showOnDashboard;
                const savedActionSet = await actionSetRepo.save(actionSet);
                if (Array.isArray(entry.actions)) {
                  for (const action of entry.actions) {
                    const actionSetAction = new ActionSetAction();
                    actionSetAction.id = action.id;
                    actionSetAction.type = action.type;
                    actionSetAction.action = action.action;
                    actionSetAction.metadata = action.metadata;
                    actionSetAction.actionSet = savedActionSet;
                    await actionRepo.save(actionSetAction);
                  }
                }
              }
            }
          }

          // API keys
          {
            const path = resolve(extractDir, "api_keys.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing API keys");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const repo = transactionalEntityManager.getRepository(ApiKey);
              await repo.createQueryBuilder().delete().execute();
              for (const entry of data) {
                const apiKey = new ApiKey();
                apiKey.apiKey = entry.apiKey;
                apiKey.name = entry.name;
                apiKey.superUser = entry.superUser;
                await repo.save(apiKey);
              }
            }
          }

          // Users
          {
            const path = resolve(extractDir, "users.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing users");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const repo = transactionalEntityManager.getRepository(User);
              await repo.createQueryBuilder().delete().execute();
              for (const entry of data) {
                const user = new User();
                user.id = entry.id;
                user.username = entry.username;
                user.password = entry.password;
                user.lasPasswordChange = entry.lasPasswordChange;
                user.superUser = entry.superUser;
                await repo.save(user);
              }
            }
          }

          // Boop sensor profiles
          {
            const path = resolve(extractDir, "boop_sensor_profiles.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing boop sensor profiles");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const profileRepo = transactionalEntityManager.getRepository(BoopSensorProfile);
              const actionRepo = transactionalEntityManager.getRepository(BoopSensorProfileAction);
              await actionRepo.createQueryBuilder().delete().execute();
              await profileRepo.createQueryBuilder().delete().execute();
              for (const entry of data) {
                const profile = new BoopSensorProfile();
                profile.id = entry.id;
                profile.name = entry.name;
                profile.resetsAfter = entry.resetsAfter;
                const savedProfile = await profileRepo.save(profile);
                if (Array.isArray(entry.actions)) {
                  for (const action of entry.actions) {
                    const profileAction = new BoopSensorProfileAction();
                    profileAction.id = action.id;
                    profileAction.triggerAtValue = action.triggerAtValue;
                    profileAction.actionType = action.actionType;
                    profileAction.action = action.action;
                    profileAction.metadata = action.metadata;
                    profileAction.triggerMultipleTimes = action.triggerMultipleTimes;
                    profileAction.profile = savedProfile;
                    await actionRepo.save(profileAction);
                  }
                }
              }
            }
          }

          // Gamepad profiles
          {
            const path = resolve(extractDir, "gamepad_profiles.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing gamepad profiles");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const profileRepo = transactionalEntityManager.getRepository(GamepadProfile);
              const actionRepo = transactionalEntityManager.getRepository(GamepadProfileAction);
              await actionRepo.createQueryBuilder().delete().execute();
              await profileRepo.createQueryBuilder().delete().execute();
              for (const entry of data) {
                const profile = new GamepadProfile();
                profile.id = entry.id;
                profile.name = entry.name;
                const savedProfile = await profileRepo.save(profile);
                if (Array.isArray(entry.actions)) {
                  for (const action of entry.actions) {
                    const profileAction = new GamepadProfileAction();
                    profileAction.id = action.id;
                    profileAction.trigger = action.trigger;
                    profileAction.actionType = action.actionType;
                    profileAction.action = action.action;
                    profileAction.profile = savedProfile;
                    await actionRepo.save(profileAction);
                  }
                }
              }
            }
          }

          // RGB scenes (3 levels: scene → effect → properties)
          {
            const path = resolve(extractDir, "rgb_scenes.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing RGB scenes");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const sceneRepo = transactionalEntityManager.getRepository(StoredRgbScene);
              const effectRepo = transactionalEntityManager.getRepository(RgbSceneEffect);
              const propRepo = transactionalEntityManager.getRepository(RgbSceneEffectProperty);
              await propRepo.createQueryBuilder().delete().execute();
              await effectRepo.createQueryBuilder().delete().execute();
              await sceneRepo.createQueryBuilder().delete().execute();
              for (const entry of data) {
                const scene = new StoredRgbScene();
                scene.id = entry.id;
                scene.name = entry.name;
                const savedScene = await sceneRepo.save(scene);
                if (Array.isArray(entry.effects)) {
                  for (const effectEntry of entry.effects) {
                    const effect = new RgbSceneEffect();
                    effect.id = effectEntry.id;
                    effect.effect = effectEntry.effect;
                    effect.displayName = effectEntry.displayName;
                    effect.scene = savedScene;
                    const savedEffect = await effectRepo.save(effect);
                    if (Array.isArray(effectEntry.properties)) {
                      for (const propEntry of effectEntry.properties) {
                        const prop = new RgbSceneEffectProperty();
                        prop.key = propEntry.key;
                        prop.value = propEntry.value;
                        prop.effect = savedEffect;
                        await propRepo.save(prop);
                      }
                    }
                  }
                }
              }
            }
          }

          // RGB editor config
          {
            const path = resolve(extractDir, "rgb_editor_config.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing RGB editor config");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const repo = transactionalEntityManager.getRepository(RgbEditorPreviewElement);
              await repo.createQueryBuilder().delete().execute();
              for (const entry of data) {
                const element = new RgbEditorPreviewElement();
                element.uuid = entry.uuid;
                element.name = entry.name;
                element.type = entry.type;
                element.x = entry.x;
                element.y = entry.y;
                element.startIndex = entry.startIndex;
                element.length = entry.length;
                await repo.save(element);
              }
            }
          }

          // Video player data: groups + videos (flat) + cache
          {
            const path = resolve(extractDir, "video_player_data.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing video player data");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const groupRepo = transactionalEntityManager.getRepository(SavedVideoGroup);
              const videoRepo = transactionalEntityManager.getRepository(SavedVideo);
              const cacheRepo = transactionalEntityManager.getRepository(VideoCache);
              // Delete videos before groups (FK is SET NULL, not CASCADE)
              await videoRepo.createQueryBuilder().delete().execute();
              await cacheRepo.createQueryBuilder().delete().execute();
              await groupRepo.createQueryBuilder().delete().execute();

              const groupMap = new Map<number, SavedVideoGroup>();
              if (Array.isArray(data.groups)) {
                for (const groupEntry of data.groups) {
                  const group = new SavedVideoGroup();
                  group.id = groupEntry.id;
                  group.name = groupEntry.name;
                  const savedGroup = await groupRepo.save(group);
                  groupMap.set(savedGroup.id, savedGroup);
                }
              }

              if (Array.isArray(data.videos)) {
                // Current format: flat videos array with groupId
                for (const videoEntry of data.videos) {
                  const video = new SavedVideo();
                  video.id = videoEntry.id;
                  video.sortingNumber = videoEntry.sortingNumber;
                  video.name = videoEntry.name;
                  video.url = videoEntry.url;
                  video.mirrorVideo = videoEntry.mirrorVideo;
                  video.flipVideo = videoEntry.flipVideo;
                  video.isStream = videoEntry.isStream;
                  video.hideUrl = videoEntry.hideUrl;
                  video.group = videoEntry.groupId != null ? (groupMap.get(videoEntry.groupId) ?? null) : null;
                  await videoRepo.save(video);
                }
              } else if (Array.isArray(data.groups)) {
                // Legacy format: videos nested within groups (no ungrouped video support)
                for (const groupEntry of data.groups) {
                  const savedGroup = groupMap.get(groupEntry.id) ?? null;
                  if (Array.isArray(groupEntry.videos)) {
                    for (const videoEntry of groupEntry.videos) {
                      const video = new SavedVideo();
                      video.id = videoEntry.id;
                      video.sortingNumber = videoEntry.sortingNumber;
                      video.name = videoEntry.name;
                      video.url = videoEntry.url;
                      video.mirrorVideo = videoEntry.mirrorVideo;
                      video.flipVideo = videoEntry.flipVideo;
                      video.isStream = videoEntry.isStream;
                      video.hideUrl = videoEntry.hideUrl;
                      video.group = savedGroup;
                      await videoRepo.save(video);
                    }
                  }
                }
              }
              if (Array.isArray(data.cache)) {
                for (const cacheEntry of data.cache) {
                  const cache = new VideoCache();
                  cache.id = cacheEntry.id;
                  cache.urlHash = cacheEntry.urlHash;
                  cache.settingsHash = cacheEntry.settingsHash;
                  cache.hash = cacheEntry.hash;
                  cache.jobId = cacheEntry.jobId;
                  await cacheRepo.save(cache);
                }
              }
            }
          }

          // Visor data: color effects (with properties) + custom faces + expressions
          {
            const path = resolve(extractDir, "visor_data.json");
            if (existsSync(path)) {
              this.protogen.logger.info("Backup", "Importing visor data");
              const data = JSON.parse(readFileSync(path, "utf-8"));
              const customFaceRepo = transactionalEntityManager.getRepository(CustomFace);
              const expressionRepo = transactionalEntityManager.getRepository(FaceExpressionData);
              const colorEffectRepo = transactionalEntityManager.getRepository(FaceColorEffect);
              const colorEffectPropRepo = transactionalEntityManager.getRepository(FaceColorEffectProperty);

              await expressionRepo.createQueryBuilder().delete().execute();
              await colorEffectPropRepo.createQueryBuilder().delete().execute();
              await colorEffectRepo.createQueryBuilder().delete().execute();
              await customFaceRepo.createQueryBuilder().delete().execute();

              if (Array.isArray(data.colorEffects)) {
                for (const entry of data.colorEffects) {
                  const colorEffect = new FaceColorEffect();
                  colorEffect.uuid = entry.uuid;
                  colorEffect.name = entry.name;
                  colorEffect.effect = entry.effect;
                  const savedColorEffect = await colorEffectRepo.save(colorEffect);
                  if (Array.isArray(entry.properties)) {
                    for (const propEntry of entry.properties) {
                      const prop = new FaceColorEffectProperty();
                      prop.key = propEntry.key;
                      prop.value = propEntry.value;
                      prop.effect = savedColorEffect;
                      await colorEffectPropRepo.save(prop);
                    }
                  }
                }
              }

              if (Array.isArray(data.faces)) {
                for (const entry of data.faces) {
                  const face = new CustomFace();
                  face.uuid = entry.uuid;
                  face.name = entry.name;
                  face.mirrorImage = entry.mirrorImage;
                  face.flipRightSide = entry.flipRightSide;
                  face.flipLeftSide = entry.flipLeftSide;
                  face.image = entry.image;
                  await customFaceRepo.save(face);
                }
              }

              // Expressions reference color effects so must be imported after
              if (Array.isArray(data.expressions)) {
                for (const entry of data.expressions) {
                  const expression = new FaceExpressionData();
                  expression.uuid = entry.uuid;
                  expression.name = entry.name;
                  expression.image = entry.image;
                  expression.mirrorImage = entry.mirrorImage;
                  expression.flipRightSide = entry.flipRightSide;
                  expression.flipLeftSide = entry.flipLeftSide;
                  expression.replaceColors = entry.replaceColors;
                  expression.linkedColorEffect = entry.linkedColorEffect
                    ? { uuid: entry.linkedColorEffect.uuid } as FaceColorEffect
                    : null;
                  await expressionRepo.save(expression);
                }
              }
            }
          }

          // Import image and video files
          const imageSource = resolve(extractDir, "images");
          const videoSource = resolve(extractDir, "videos");

          if (existsSync(imageSource)) {
            this.protogen.logger.info("Backup", "Importing images");
            rimrafSync(this.protogen.imageDirectory);
            await cp(imageSource, this.protogen.imageDirectory, { recursive: true });
          }

          if (existsSync(videoSource)) {
            this.protogen.logger.info("Backup", "Importing videos");
            rimrafSync(this.protogen.videoDirectory);
            await cp(videoSource, this.protogen.videoDirectory, { recursive: true });
          }

          this.protogen.logger.info("Backup", "Import completed successfully");
        });

        const autoRestart = this.protogen.config.systemFeatures.systemd;

        res.json({ autoRestart });

        try {
          if (autoRestart) {
            this.protogen.logger.info("Backup", "Restarting process to apply imported backup");
            await this.protogen.hardwareAbstractionLayer.restartProcess();
            process.exit(0);
          } else {
            this.protogen.logger.info("Backup", "Backup imported successfully. Please restart the process to apply changes.");
          }
        } catch (err) {
          this.protogen.logger.error("Backup", "Error during post-import restart");
          console.error(err);
        }
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}