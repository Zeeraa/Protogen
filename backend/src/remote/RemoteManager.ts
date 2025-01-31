import { Equal } from "typeorm";
import { RemoteControlActionType } from "../database/models/remote/RemoteControlActionType";
import { SavedVideo } from "../database/models/video-player/SavedVideos.model";
import { Protogen } from "../Protogen";
import { KV_RemoteFlipAxis, KV_RemoteInvertX, KV_RemoteInvertY } from "../utils/KVDataStorageKeys";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";
import { RemoteState } from "./RemoteState";

export class RemoteManager {
  private _protogen;
  private _state: RemoteState;
  public invertX: boolean;
  public invertY: boolean;
  public flipAxis: boolean;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._state = {
      activeProfileId: -1,
      buttonA: false,
      buttonLeft: false,
      buttonRight: false,
      joystickPressed: false,
      joystickX: 0.5,
      joystickY: 0.5,
    }

    this.invertX = false;
    this.invertY = false;
    this.flipAxis = false;
  }

  public async loadConfig() {
    await this.protogen.database.initMissingData(KV_RemoteInvertX, "false");
    await this.protogen.database.initMissingData(KV_RemoteInvertY, "false");
    await this.protogen.database.initMissingData(KV_RemoteFlipAxis, "false");

    this.invertX = await this.protogen.database.getData(KV_RemoteInvertX) == "true";
    this.invertY = await this.protogen.database.getData(KV_RemoteInvertY) == "true";
    this.flipAxis = await this.protogen.database.getData(KV_RemoteFlipAxis) == "true";
  }

  public async saveConfig() {
    await this.protogen.database.setData(KV_RemoteInvertX, String(this.invertX));
    await this.protogen.database.setData(KV_RemoteInvertY, String(this.invertY));
    await this.protogen.database.setData(KV_RemoteFlipAxis, String(this.flipAxis));
  }

  public async performAction(type: RemoteControlActionType, action: string | null) {
    //#region Start video playback
    if (type == RemoteControlActionType.PLAY_VIDEO) {
      const id = parseInt(action || "");
      if (isNaN(id)) {
        this.protogen.logger.error("Remote", "Invalid id passed");
        return;
      }

      const repo = this.protogen.database.dataSource.getRepository(SavedVideo);

      const video = await repo.findOne({
        where: {
          id: Equal(id),
        }
      });

      if (video == null) {
        this.protogen.logger.error("Remote", "Failed to play saved video since id was not found in database");
        return;
      }

      if (video.isStream) {
        await this.protogen.videoPlaybackManager.streamVideo(video.url);
      } else {
        await this.protogen.videoPlaybackManager.playVideo(video.url, video.mirrorVideo, video.flipVideo);
      }

      return true;
    }
    //#endregion

    //#region Stop video playback
    if (type == RemoteControlActionType.STOP_VIDEO) {
      this.protogen.videoPlaybackManager.kill();
    }
    //#endregion
    return false;
  }

  get protogen() {
    return this._protogen;
  }

  get state() {
    return this._state;
  }

  set state(state: RemoteState) {
    this._state = state;
    this.protogen.webServer.socketSessions.filter(s => s.enableRemotePreview).forEach(subscriber => {
      subscriber.sendMessage(SocketMessageType.S2C_RemoteState, state);
    })
  }
}