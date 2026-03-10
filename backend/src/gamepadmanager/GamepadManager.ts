import { Protogen } from "../Protogen";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";
import { GamepadAxes, GamepadAxesMessage, GamepadButtons, GamepadButtonMessage, GamepadState, GamepadStatusMessage } from "./GamepadState";

const TOPIC_STATUS = "protogen/gamepad/status";
const TOPIC_BUTTON = "protogen/gamepad/button";
const TOPIC_AXES = "protogen/gamepad/axes";

export class GamepadManager {
  private readonly protogen: Protogen;
  private readonly _state: GamepadState;

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
        this._markConnected();
      } catch (e) {
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
        this._markConnected();
      } catch (e) {
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
  }

  private _markConnected(): void {
    if (!this._state.connected) {
      this._state.connected = true;
      this.protogen.logger.info("GamepadManager", "Gamepad marked as connected from incoming data");
    }
  }

  public get state(): Readonly<GamepadState> {
    return this._state;
  }

  public get connected(): boolean {
    return this._state.connected;
  }
}
