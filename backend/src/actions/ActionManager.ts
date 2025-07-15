import { Equal } from "typeorm";
import { Protogen } from "../Protogen";
import { ActionType } from "./ActionType";
import { SavedVideo } from "../database/models/video-player/SavedVideos.model";
import { ActionSet } from "../database/models/actions/ActionSet.model";
import { cyan } from "colors";

const MaxReqursionDept = 10;

export class ActionManager {
  private _protogen;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  get protogen() {
    return this._protogen;
  }

  public async runActionSet(id: number, reqursionProtectionCounter = 0): Promise<boolean> {
    const repo = this.protogen.database.dataSource.getRepository(ActionSet);
    const set = await repo.findOne({
      where: {
        id: Equal(id),
      },
      relations: {
        actions: true,
      },
    });

    if (set == null) {
      this.protogen.logger.warn("ActionManager", "Failed to run action set since id " + cyan(String(id)) + " was not found in database");
      return false;
    }

    for (const action of set.actions) {
      await this.performAction(action.type, action.action, reqursionProtectionCounter);
    }

    return true;
  }

  public async performAction(type: ActionType, action: string | null, reqursionProtectionCounter = 0): Promise<boolean> {
    //#region Start video playback
    if (type == ActionType.PLAY_VIDEO) {
      const id = parseInt(action || "");
      if (isNaN(id)) {
        this.protogen.logger.error("ActionManager", "Invalid id passed");
        return false;
      }

      const repo = this.protogen.database.dataSource.getRepository(SavedVideo);

      const video = await repo.findOne({
        where: {
          id: Equal(id),
        }
      });

      if (video == null) {
        this.protogen.logger.error("ActionManager", "Failed to play saved video since id was not found in database");
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
    if (type == ActionType.STOP_VIDEO) {
      this.protogen.videoPlaybackManager.kill();
    }
    //#endregion

    //#region Activate RGB scene
    if (type == ActionType.ACTIVATE_RGB_SCENE) {
      const scene = this.protogen.rgb.scenes.find(s => s.id == action);
      if (scene == null) {
        return false;
      }

      this.protogen.rgb.setActiveScene(scene);

      return true;
    }
    //#region

    //#region Disable RGB
    if (type == ActionType.DISABLE_RGB) {
      this.protogen.rgb.setActiveScene(null);
      return true;
    }
    //#endregion

    //#region Visor renderer
    if (type == ActionType.ACTIVATE_VISOR_RENDERER) {
      const renderer = this.protogen.visor.availableRenderers.find(r => r.id == action);
      if (renderer == null) {
        return false;
      }

      this.protogen.visor.activateRenderer(renderer.id, true);
      return true;
    }
    //#endregion

    //#region Expression
    if (type == ActionType.FACE_EXPRESSION) {
      const expression = this.protogen.visor.faceRenderer.expressions.find(e => e.data.uuid == action);
      if (expression == null) {
        return false;
      }

      this.protogen.visor.faceRenderer.setActiveExpression(expression);
      return true;
    }
    //#endregion

    //#region Expression RGB
    if (type == ActionType.ACTIVATE_FACE_RGB_EFFECT) {
      const effect = this.protogen.visor.faceRenderer.availableColorEffects.find(e => e.id == action);

      if (effect == null) {
        return false;
      }

      this.protogen.visor.faceRenderer.activeColorEffect = effect;
      return true;
    }
    //#endregion

    //#region Run action set
    if (type == ActionType.RUN_ACTION_SET) {
      const id = parseInt(action || "");
      if (isNaN(id)) {
        this.protogen.logger.error("ActionManager", "Invalid action set id passed");
        return false;
      }

      if (reqursionProtectionCounter > MaxReqursionDept) {
        this.protogen.logger.warn("ActionManager", "Reqursion dept exceeded " + cyan(String(MaxReqursionDept)) + " for action set " + cyan(String(id)) + ", aborting");
        return false;
      }

      return await this.runActionSet(id, reqursionProtectionCounter + 1);
    }
    //#endregion

    return false;
  }
}
