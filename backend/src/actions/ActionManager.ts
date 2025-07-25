import { Equal } from "typeorm";
import { Protogen } from "../Protogen";
import { ActionType } from "./ActionType";
import { SavedVideo } from "../database/models/video-player/SavedVideos.model";
import { ActionSet } from "../database/models/actions/ActionSet.model";
import { cyan } from "colors";

/**
 * Max recursion depth for running action sets.
 */
const MaxReqursionDept = 10;

/**
 * ActionManager is responsible for managing and executing actions in other parts of the application.
 */
export class ActionManager {
  private _protogen;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  get protogen() {
    return this._protogen;
  }

  /**
   * Executes an action set by its ID.
   * This method retrieves the action set from the database and performs each action in the set.
   * If the action set is not found, it logs a warning and returns false.
   * @param id The ID of the action set to run.
   * @param reqursionProtectionCounter A counter to prevent infinite recursion if the action set contains nested actions.
   * @returns A promise that resolves to true if the action set was run successfully, or false otherwise.
   */
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
      await this.performAction(action.type, action.action, action.metadata, reqursionProtectionCounter);
    }

    return true;
  }

  /**
   * Performs action based on the provided type, action, and metadata.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
   * This method handles various action types such as playing videos, activating RGB scenes, and more.
   * It also includes recursion protection to prevent infinite loops in case an action triggers another action.
   *
   * @param type The type of action to perform.
   * @param action The action to perform.
   * @param metadata Additional metadata for the action.
   * @param reqursionProtectionCounter A counter to prevent infinite recursion in case that the action triggers another action.
   * @returns A promise that resolves to true if the action was performed successfully, or false otherwise.
   */
  public async performAction(type: ActionType, action: string | null, metadata: string | null, reqursionProtectionCounter = 0): Promise<boolean> {
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

    //#region Temporary expression
    if (type == ActionType.TEMPORARY_EXPRESSION) {
      const expression = this.protogen.visor.faceRenderer.expressions.find(e => e.data.uuid == action);
      if (expression == null) {
        return false;
      }

      let time = parseFloat(String(metadata));
      if (isNaN(time) || time < 0) {
        time = 2.0; // Default to 2 seconds if invalid
      }

      this.protogen.visor.faceRenderer.activateTemporaryExpression(expression, time);
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

    //#region Boop sensor
    if (type == ActionType.RESET_BOOP_SENSOR_COUNTER) {
      await this.protogen.boopSensorManager.resetBoopCounter();
      return true;
    }

    if (type == ActionType.TOGGLE_BOOP_SENSOR) {
      await this.protogen.boopSensorManager.toggleEnabled();
      return true;
    }
    //#endregion

    return false;
  }
}
