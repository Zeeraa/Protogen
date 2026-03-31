import { uuidv4, uuidv7 } from "uuidv7";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { cp, rm } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { KVDataStoreEntry } from "../../../database/models/data/KVDataStoreEntry.model";
import { ActionSet } from "../../../database/models/actions/ActionSet.model";
import { ApiKey } from "../../../database/models/apikeys/ApiKey.model";
import { User } from "../../../database/models/auth/User.model";
import { BoopSensorProfile } from "../../../database/models/boop-sensor/BoopSensorProfile.model";
import { GamepadProfile } from "../../../database/models/gamepad/GamepadProfile.model";
import { StoredRgbScene } from "../../../database/models/rgb/StoredRgbScene.model";
import { RgbEditorPreviewElement } from "../../../database/models/rgb/RgbEditorConfig.model";
import { SavedVideoGroup } from "../../../database/models/video-player/SavedVideoGroup.model";
import { VideoCache } from "../../../database/models/video-player/VideoCache.model";
import { CustomFace } from "../../../database/models/visor/CustomFace.model";
import { FaceExpressionData } from "../../../database/models/visor/FaceExpression.model";
import { FaceColorEffect } from "../../../database/models/visor/FaceColorEffect";

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
      if (req.auth.isSuperUser !== true) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const token = uuidv4();
      this.pendingDownloadTokens.set(token, { expires: Date.now() + 30 * 1000 }); // Token valid for 30 seconds
      res.json({ token });
    });

    this.router.get("/download", async (req, res) => {
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
        const tempDirectory = resolve(this.protogen.tempDirectory, uuidv7());
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
          const allEntries = await videoGroupsRepo.find({ relations: { videos: true } });

          const videoCacheRepo = this.protogen.database.dataSource.getRepository(VideoCache);
          const cacheEntries = await videoCacheRepo.find();

          const data = {
            groups: allEntries,
            cache: cacheEntries,
          }

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
        const tempArchive = resolve(this.protogen.tempDirectory, uuidv7() + ".tar.gz");

        try {
          await execFileAsync("tar", ["-czf", tempArchive, "-C", tempDirectory, "."]);
        } catch (tarErr) {
          throw tarErr;
        }
        await rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined);

        const filename = `protogen-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
        res.download(tempArchive, filename);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}