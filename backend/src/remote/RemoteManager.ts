import { Equal } from "typeorm";
import { RemoteControlActionType } from "../database/models/remote/RemoteControlActionType";
import { SavedVideo } from "../database/models/video-player/SavedVideos.model";
import { Protogen } from "../Protogen";
import { KV_RemoteFlipAxis, KV_RemoteInvertX, KV_RemoteInvertY } from "../utils/KVDataStorageKeys";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";
import { RemoteState } from "./RemoteState";
import { RemoteControlInputType } from "../database/models/remote/RemoteControlInputType";
import { uuidv7 } from "uuidv7";

export class RemoteManager {
  private _protogen;
  private _state: RemoteState;
  private _stateReportingKey: string;
  public invertX: boolean;
  public invertY: boolean;
  public flipAxis: boolean;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._state = {
      state: RemoteControlInputType.JOYSTICK_CENTER,
      activeProfileId: -1,
      buttonA: false,
      buttonLeft: false,
      buttonRight: false,
      joystickPressed: false,
      joystickX: 0.5,
      joystickY: 0.5,
    }

    this._stateReportingKey = uuidv7();
    this.invertX = false;
    this.invertY = false;
    this.flipAxis = false;
  }

  public get stateReportingKey() {
    return this._stateReportingKey;
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

  public async performAction(type: RemoteControlActionType, action: string | null): Promise<boolean> {
    //#region Start video playback
    if (type == RemoteControlActionType.PLAY_VIDEO) {
      const id = parseInt(action || "");
      if (isNaN(id)) {
        this.protogen.logger.error("Remote", "Invalid id passed");
        return false;
      }

      const repo = this.protogen.database.dataSource.getRepository(SavedVideo);

      const video = await repo.findOne({
        where: {
          id: Equal(id),
        }
      });

      if (video == null) {
        this.protogen.logger.error("Remote", "Failed to play saved video since id was not found in database");
        return false;
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

    //#region Activate RGB scene
    if (type == RemoteControlActionType.ACTIVATE_RGB_SCENE) {
      const scene = this.protogen.rgb.scenes.find(s => s.id == action);
      if (scene == null) {
        return false;
      }

      this.protogen.rgb.setActiveScene(scene);

      return true;
    }
    //#region

    //#region Disable RGB
    if (type == RemoteControlActionType.DISABLE_RGB) {
      this.protogen.rgb.setActiveScene(null);
      return true;
    }
    //#endregion

    //#region Visor renderer
    if (type == RemoteControlActionType.ACTIVATE_VISOR_RENDERER) {
      const renderer = this.protogen.visor.availableRenderers.find(r => r.id == action);
      if (renderer == null) {
        return false;
      }

      this.protogen.visor.activateRenderer(renderer.id, true);
      return true;
    }
    //#endregion

    //#region Expression
    if (type == RemoteControlActionType.FACE_EXPRESSION) {
      const expression = this.protogen.visor.faceRenderer.expressions.find(e => e.data.uuid == action);
      if (expression == null) {
        return false;
      }

      this.protogen.visor.faceRenderer.setActiveExpression(expression);
      return true;
    }
    //#endregion

    //#region Expression RGB
    if (type == RemoteControlActionType.ACTIVATE_FACE_RGB_EFFECT) {
      const effect = this.protogen.visor.faceRenderer.availableColorEffects.find(e => e.id == action);

      if (effect == null) {
        return false;
      }

      this.protogen.visor.faceRenderer.activeColorEffect = effect;
      return true;
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
