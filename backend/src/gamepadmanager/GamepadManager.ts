import { uuidv7 } from "uuidv7";
import { Protogen } from "../Protogen";
import { KV_ActiveGamepadProfile, KV_GamepadEnablePreview, KV_GamepadType } from "../utils/KVDataStorageKeys";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";
import { GamepadAxes, GamepadAxesMessage, GamepadButtons, GamepadButtonMessage, GamepadState, GamepadStatusMessage, GamepadActionTriggers } from "./GamepadState";
import { GamepadProfile } from "../database/models/gamepad/GamepadProfile.model";
import { ActionType } from "../actions/ActionType";
import { FaceRendererId } from "../visor/rendering/renderers/special/face/VisorFaceRender";
import { writeFile } from "fs/promises";
import { execAsync } from "../utils/SystemUtils";

const TOPIC_STATUS = "protogen/gamepad/status";
const TOPIC_BUTTON = "protogen/gamepad/button";
const TOPIC_AXES = "protogen/gamepad/axes";

const GAMEPAD_CONFIG_PATH = "/home/pi/protogen/gamepad_config.json";

const ANALOG_ACTIVATION_THRESHOLD = 0.50;
const STICK_CENTER_THRESHOLD = 0.20;

enum StickDirection {
  CENTER = "CENTER",
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

interface StickTriggers {
  up: GamepadActionTriggers;
  down: GamepadActionTriggers;
  left: GamepadActionTriggers;
  right: GamepadActionTriggers;
  center: GamepadActionTriggers;
}

export class GamepadManager {
  private readonly protogen: Protogen;
  private readonly _state: GamepadState;
  private _enablePreview: boolean = false;
  private _type: GamepadType = GamepadType.PLAYSTATION;
  private _profiles: GamepadProfile[] = [];
  private _activeProfile: GamepadProfile | null = null;

  private _leftStickDirection: StickDirection = StickDirection.CENTER;
  private _rightStickDirection: StickDirection = StickDirection.CENTER;
  private _leftStickExpressionLocked: boolean = false;
  private _rightStickExpressionLocked: boolean = false;
  private _ltActive: boolean = false;
  private _rtActive: boolean = false;
  private _dpadXActive: number = 0;
  private _dpadYActive: number = 0;

  private static readonly DEFAULT_BUTTONS: GamepadButtons = {
    A: false, B: false, X: false, Y: false,
    LB: false, RB: false,
    SELECT: false, START: false, HOME: false,
    LS: false, RS: false,
  };

  private static readonly DEFAULT_AXES: GamepadAxes = {
    LEFT_X: 0, LEFT_Y: 0, RIGHT_X: 0, RIGHT_Y: 0,
    LT: 0, RT: 0, DPAD_X: 0, DPAD_Y: 0,
  };

  constructor(protogen: Protogen) {
    this.protogen = protogen;
    this._state = {
      connected: false,
      name: "",
      buttons: { ...GamepadManager.DEFAULT_BUTTONS },
      axes: { ...GamepadManager.DEFAULT_AXES },
    };
  }

  public async init(): Promise<void> {
    const mqtt = this.protogen.mqttManager;

    mqtt.subscribe(TOPIC_STATUS, (_topic, message) => {
      try {
        const data: GamepadStatusMessage = JSON.parse(message.toString());
        this._state.connected = data.connected;
        this._state.name = data.name;
        if (!data.connected) {
          this._state.buttons = { ...GamepadManager.DEFAULT_BUTTONS };
          this._state.axes = { ...GamepadManager.DEFAULT_AXES };
        }
        this.protogen.logger.info("GamepadManager", `Gamepad ${data.connected ? "connected" : "disconnected"}: ${data.name}`);
      } catch (e) {
        console.error(e);
        this.protogen.logger.error("GamepadManager", "Failed to parse gamepad status message");
      }
    });

    mqtt.subscribe(TOPIC_BUTTON, (_topic, message) => {
      try {
        const data: GamepadButtonMessage = JSON.parse(message.toString());
        const key = data.name as keyof GamepadButtons;
        if (key in this._state.buttons) {
          this._state.buttons[key] = data.pressed;
        }
        this.markConnected();
        if (data.pressed) {
          void this.triggerButtonAction(data.name);
        }
      } catch (e) {
        console.error(e);
        this.protogen.logger.error("GamepadManager", "Failed to parse gamepad button message");
      }
    });

    mqtt.subscribe(TOPIC_AXES, (_topic, message) => {
      try {
        const data: GamepadAxesMessage = JSON.parse(message.toString());
        const axes = data.axes as Record<string, number>;
        for (const [key, value] of Object.entries(axes)) {
          if (key in this._state.axes) {
            this._state.axes[key as keyof GamepadAxes] = value;
          }
        }
        this.markConnected();
        this.processAxesActions(axes);
      } catch (e) {
        console.error(e);
        this.protogen.logger.error("GamepadManager", "Failed to parse gamepad axes message");
      }
    });

    this.protogen.logger.info("GamepadManager", "Subscribed to gamepad MQTT topics");

    setInterval(() => {
      this.protogen.webServer.socketSessions.filter(s => s.enableGamepadPreview).forEach(socket => {
        socket.sendMessage(SocketMessageType.S2C_GamepadState, {
          state: this._state,
        });
      })
    }, 100);

    await this.protogen.database.initMissingData(KV_GamepadType, GamepadType.PLAYSTATION);
    await this.protogen.database.initMissingData(KV_GamepadEnablePreview, "true");

    this._type = await this.protogen.database.getData(KV_GamepadType) as GamepadType;
    if (!Object.values(GamepadType).includes(this._type)) {
      this._type = GamepadType.PLAYSTATION;
      await this.protogen.database.setData(KV_GamepadType, this._type);
    }

    await this.writeGamepadConfig(this._type);

    this._enablePreview = (await this.protogen.database.getData(KV_GamepadEnablePreview)) === "true";

    const profileRepo = this.protogen.database.dataSource.getRepository(GamepadProfile);
    this._profiles = await profileRepo.find({ relations: { actions: true } });

    const activeProfileId = await this.protogen.database.getData(KV_ActiveGamepadProfile);
    if (activeProfileId != null) {
      const profile = this._profiles.find(p => p.id === activeProfileId);
      if (profile != null) {
        await this.setActiveProfile(profile, false);
      } else {
        this.protogen.logger.warn("GamepadManager", "Last active gamepad profile not found");
      }
    }
  }

  private markConnected(): void {
    if (!this._state.connected) {
      this._state.connected = true;
      this.protogen.logger.info("GamepadManager", "Gamepad marked as connected from incoming data");
    }
  }

  public get state(): Readonly<GamepadState> {
    return this._state;
  }

  public get profiles(): ReadonlyArray<GamepadProfile> {
    return this._profiles;
  }

  public get activeProfile(): GamepadProfile | null {
    return this._activeProfile;
  }

  public async createProfile(name: string): Promise<GamepadProfile> {
    const repo = this.protogen.database.dataSource.getRepository(GamepadProfile);
    const profile = new GamepadProfile();
    profile.id = uuidv7();
    profile.name = name;
    profile.actions = [];
    const saved = await repo.save(profile);
    this._profiles.push(saved);
    return saved;
  }

  public async saveProfile(profile: GamepadProfile): Promise<GamepadProfile> {
    const repo = this.protogen.database.dataSource.getRepository(GamepadProfile);
    const saved = await repo.save(profile);
    const idx = this._profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1) {
      this._profiles[idx] = saved;
    }
    if (this._activeProfile?.id === profile.id) {
      this._activeProfile = saved;
    }
    return saved;
  }

  public async deleteProfile(profile: GamepadProfile): Promise<void> {
    if (this._activeProfile?.id === profile.id) {
      await this.setActiveProfile(null);
    }
    const repo = this.protogen.database.dataSource.getRepository(GamepadProfile);
    await repo.delete(profile.id);
    this._profiles = this._profiles.filter(p => p.id !== profile.id);
  }

  public async setActiveProfile(profile: GamepadProfile | null, updateDatabase = true): Promise<void> {
    this._activeProfile = profile;
    if (updateDatabase) {
      await this.protogen.database.setData(KV_ActiveGamepadProfile, profile?.id ?? null);
    }
    if (profile != null) {
      this.protogen.logger.info("GamepadManager", `Active profile set to: ${profile.name} (${profile.id})`);
    } else {
      this.protogen.logger.info("GamepadManager", "Active profile cleared");
    }
  }

  public get connected(): boolean {
    return this._state.connected;
  }

  public get type() {
    return this._type;
  }

  public async setTypePersistently(type: GamepadType): Promise<void> {
    this.protogen.logger.info("GamepadManager", `Gamepad type changed to: ${type}`);
    this._type = type;
    await this.protogen.database.setData(KV_GamepadType, type);
    await this.writeGamepadConfig(type);
    await this.restartGamepadListener();
  }

  private async writeGamepadConfig(type: GamepadType): Promise<void> {
    const config = { steam_controller: type === GamepadType.STEAM_CONTROLLER };
    await writeFile(GAMEPAD_CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    this.protogen.logger.info("GamepadManager", `Wrote gamepad config for type: ${type}`);
  }

  private async restartGamepadListener(): Promise<void> {
    try {
      await execAsync("sudo systemctl restart gamepad-listener");
      this.protogen.logger.info("GamepadManager", "Restarted gamepad-listener service");
    } catch (err) {
      this.protogen.logger.error("GamepadManager", "Failed to restart gamepad-listener service");
      console.error(err);
    }
  }

  public async restartGamepadListenerService(): Promise<void> {
    this.protogen.logger.info("GamepadManager", "Gamepad listener restart requested via API");
    await this.restartGamepadListener();
  }

  public get enablePreview(): boolean {
    return this._enablePreview;
  }

  public async setEnablePreviewPersistently(enable: boolean): Promise<void> {
    this._enablePreview = enable;
    await this.protogen.database.setData(KV_GamepadEnablePreview, enable ? "true" : "false");
  }

  private async triggerAction(trigger: GamepadActionTriggers): Promise<void> {
    if (this._activeProfile == null) return;
    const action = this._activeProfile.actions.find(a => a.trigger === trigger);
    if (action == null || action.actionType === ActionType.NONE) return;
    await this.protogen.actionManager.performAction(action.actionType, action.action, null);
  }

  private async triggerButtonAction(name: string): Promise<void> {
    const triggerMap: Partial<Record<string, GamepadActionTriggers>> = {
      A: GamepadActionTriggers.BUTTON_A,
      B: GamepadActionTriggers.BUTTON_B,
      X: GamepadActionTriggers.BUTTON_X,
      Y: GamepadActionTriggers.BUTTON_Y,
      LB: GamepadActionTriggers.BUTTON_LB,
      RB: GamepadActionTriggers.BUTTON_RB,
      SELECT: GamepadActionTriggers.BUTTON_SELECT,
      START: GamepadActionTriggers.BUTTON_START,
      HOME: GamepadActionTriggers.BUTTON_HOME,
    };
    const trigger = triggerMap[name];
    if (trigger != null) {
      await this.triggerAction(trigger);
      return;
    }

    if (name === "LS") {
      await this.handleStickClick(
        this._leftStickDirection,
        { up: GamepadActionTriggers.LEFT_STICK_UP, down: GamepadActionTriggers.LEFT_STICK_DOWN, left: GamepadActionTriggers.LEFT_STICK_LEFT, right: GamepadActionTriggers.LEFT_STICK_RIGHT, center: GamepadActionTriggers.LEFT_STICK_CENTER },
        (v) => { this._leftStickExpressionLocked = v; },
      );
    } else if (name === "RS") {
      await this.handleStickClick(
        this._rightStickDirection,
        { up: GamepadActionTriggers.RIGHT_STICK_UP, down: GamepadActionTriggers.RIGHT_STICK_DOWN, left: GamepadActionTriggers.RIGHT_STICK_LEFT, right: GamepadActionTriggers.RIGHT_STICK_RIGHT, center: GamepadActionTriggers.RIGHT_STICK_CENTER },
        (v) => { this._rightStickExpressionLocked = v; },
      );
    }
  }

  private processAxesActions(axes: Record<string, number>): void {
    if ("LEFT_X" in axes || "LEFT_Y" in axes) {
      this.processStick(
        this._state.axes.LEFT_X,
        this._state.axes.LEFT_Y,
        this._leftStickDirection,
        (dir) => { this._leftStickDirection = dir; },
        this._leftStickExpressionLocked,
        (v) => { this._leftStickExpressionLocked = v; },
        GamepadActionTriggers.LEFT_STICK_UP,
        GamepadActionTriggers.LEFT_STICK_DOWN,
        GamepadActionTriggers.LEFT_STICK_LEFT,
        GamepadActionTriggers.LEFT_STICK_RIGHT,
        GamepadActionTriggers.LEFT_STICK_CENTER,
      );
    }

    if ("RIGHT_X" in axes || "RIGHT_Y" in axes) {
      this.processStick(
        this._state.axes.RIGHT_X,
        this._state.axes.RIGHT_Y,
        this._rightStickDirection,
        (dir) => { this._rightStickDirection = dir; },
        this._rightStickExpressionLocked,
        (v) => { this._rightStickExpressionLocked = v; },
        GamepadActionTriggers.RIGHT_STICK_UP,
        GamepadActionTriggers.RIGHT_STICK_DOWN,
        GamepadActionTriggers.RIGHT_STICK_LEFT,
        GamepadActionTriggers.RIGHT_STICK_RIGHT,
        GamepadActionTriggers.RIGHT_STICK_CENTER,
      );
    }

    if ("LT" in axes) {
      this.processTrigger(
        axes["LT"],
        this._ltActive,
        (active) => { this._ltActive = active; },
        GamepadActionTriggers.LEFT_TRIGGER_DOWN,
      );
    }

    if ("RT" in axes) {
      this.processTrigger(
        axes["RT"],
        this._rtActive,
        (active) => { this._rtActive = active; },
        GamepadActionTriggers.RIGHT_TRIGGER_DOWN,
      );
    }

    if ("DPAD_X" in axes) {
      this.processDpad(
        axes["DPAD_X"],
        this._dpadXActive,
        (dir) => { this._dpadXActive = dir; },
        GamepadActionTriggers.DPAD_LEFT,
        GamepadActionTriggers.DPAD_RIGHT,
      );
    }

    if ("DPAD_Y" in axes) {
      this.processDpad(
        axes["DPAD_Y"],
        this._dpadYActive,
        (dir) => { this._dpadYActive = dir; },
        GamepadActionTriggers.DPAD_UP,
        GamepadActionTriggers.DPAD_DOWN,
      );
    }
  }

  private resolveStickDirection(x: number, y: number): StickDirection | null {
    if (Math.abs(x) >= ANALOG_ACTIVATION_THRESHOLD || Math.abs(y) >= ANALOG_ACTIVATION_THRESHOLD) {
      if (Math.abs(x) >= Math.abs(y)) {
        return x >= 0 ? StickDirection.RIGHT : StickDirection.LEFT;
      } else {
        return y >= 0 ? StickDirection.DOWN : StickDirection.UP;
      }
    }
    return null;
  }

  private isExpressionAction(trigger: GamepadActionTriggers): boolean {
    if (this._activeProfile == null) return false;
    const action = this._activeProfile.actions.find(a => a.trigger === trigger);
    return action?.actionType === ActionType.FACE_EXPRESSION;
  }

  private triggerForDirection(dir: StickDirection, triggers: StickTriggers): GamepadActionTriggers | null {
    switch (dir) {
      case StickDirection.UP: return triggers.up;
      case StickDirection.DOWN: return triggers.down;
      case StickDirection.LEFT: return triggers.left;
      case StickDirection.RIGHT: return triggers.right;
      default: return null;
    }
  }

  private async handleStickClick(
    currentDir: StickDirection,
    triggers: StickTriggers,
    setLocked: (v: boolean) => void,
  ): Promise<void> {
    const directionalTrigger = currentDir === StickDirection.CENTER
      ? triggers.center
      : this.triggerForDirection(currentDir, triggers);

    if (directionalTrigger != null && this.isExpressionAction(directionalTrigger)) {
      // Position has an expression configured — activate it, persist it, and (for directional) lock the stick
      const profileAction = this._activeProfile?.actions.find(a => a.trigger === directionalTrigger);
      if (profileAction != null) {
        const expression = this.protogen.visor.faceRenderer.expressions.find(e => e.data.uuid == profileAction.action);
        if (expression != null) {
          this.protogen.visor.activateRenderer(FaceRendererId);
          if (this.protogen.videoPlaybackManager) {
            if (this.protogen.videoPlaybackManager.isPlaying) {
              this.protogen.videoPlaybackManager.kill();
            }
          }
          this.protogen.visor.faceRenderer.setActiveExpression(expression);
          this.protogen.visor.faceRenderer.defaultExpression = expression.data.uuid;
          if (currentDir !== StickDirection.CENTER) {
            setLocked(true);
          }
        }
      }
    } else {
      // No expression at this position — just persist whatever is currently active
      const expr = this.protogen.visor.faceRenderer.activeExpression;
      if (expr != null) {
        this.protogen.visor.faceRenderer.defaultExpression = expr.data.uuid;
      }
    }
  }

  private processStick(
    x: number,
    y: number,
    currentDir: StickDirection,
    setDir: (dir: StickDirection) => void,
    isLocked: boolean,
    setLocked: (v: boolean) => void,
    upTrigger: GamepadActionTriggers,
    downTrigger: GamepadActionTriggers,
    leftTrigger: GamepadActionTriggers,
    rightTrigger: GamepadActionTriggers,
    centerTrigger: GamepadActionTriggers,
  ): void {
    // Return to center (only fires when coming from a non-center state)
    if (currentDir !== StickDirection.CENTER && Math.abs(x) < STICK_CENTER_THRESHOLD && Math.abs(y) < STICK_CENTER_THRESHOLD) {
      const wasLocked = isLocked;
      setDir(StickDirection.CENTER);
      setLocked(false);
      // When unlocking from a persisted expression, don't override it with the center expression.
      // But if the stick was never locked (normal movement), fire the center action as usual.
      if (!wasLocked || !this.isExpressionAction(centerTrigger)) {
        void this.triggerAction(centerTrigger);
      }
      return;
    }

    // Check if stick has crossed the activation threshold in any direction
    const newDir = this.resolveStickDirection(x, y);
    if (newDir !== null && newDir !== currentDir) {
      setDir(newDir);
      const trigger = newDir === StickDirection.UP ? upTrigger
        : newDir === StickDirection.DOWN ? downTrigger
          : newDir === StickDirection.LEFT ? leftTrigger
            : rightTrigger;
      // While locked, skip expression actions to maintain the persisted expression
      if (isLocked && this.isExpressionAction(trigger)) return;
      void this.triggerAction(trigger);
    }
  }

  private processTrigger(
    value: number,
    currentActive: boolean,
    setActive: (active: boolean) => void,
    trigger: GamepadActionTriggers,
  ): void {
    const isActive = value >= ANALOG_ACTIVATION_THRESHOLD;
    if (isActive && !currentActive) {
      setActive(true);
      void this.triggerAction(trigger);
    } else if (!isActive) {
      setActive(false);
    }
  }

  private processDpad(
    value: number,
    currentDir: number,
    setDir: (dir: number) => void,
    negativeTrigger: GamepadActionTriggers,
    positiveTrigger: GamepadActionTriggers,
  ): void {
    if (value >= ANALOG_ACTIVATION_THRESHOLD) {
      if (currentDir !== 1) {
        setDir(1);
        void this.triggerAction(positiveTrigger);
      }
    } else if (value <= -ANALOG_ACTIVATION_THRESHOLD) {
      if (currentDir !== -1) {
        setDir(-1);
        void this.triggerAction(negativeTrigger);
      }
    } else {
      setDir(0);
    }
  }
}

export enum GamepadType {
  PLAYSTATION = "playstation",
  XBOX = "xbox",
  STEAM_CONTROLLER = "steam_controller",
}