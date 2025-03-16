import { uuidv7 } from "uuidv7";
import { Protogen } from "../../Protogen";
import { Socket } from "socket.io";
import { SocketMessageType } from "./SocketMessageType";
import { SocketMessage } from "./SocketMessage";
import { AuthData } from "../middleware/AuthMiddleware";
import { z } from "zod";
import { constructJoystickRemoteStateFromSensorData } from "../../remote/JoystickRemoteState";
import { JoystickRemoteControlInputType } from "../../database/models/remote/joystick/JoystickRemoteControlInputType";

export class UserSocketSession {
  private _protogen;
  private _sessionId: string;
  private _socket;
  private _disconnected = false;
  private _enableRgbPreview = false;
  private _enableVisorPreview = false;
  private _enableRemotePreview = false;
  private _enableAudioPreview = false;
  private _auth: AuthData;

  constructor(protogen: Protogen, socket: Socket, auth: AuthData) {
    this._protogen = protogen;
    this._sessionId = uuidv7();
    this._socket = socket;
    this._auth = auth;

    socket.on("disconnect", () => {
      this._disconnected = true;
      this.protogen.webServer.disconnectSocket(this);
    });

    this._socket.on('message', (msg: any) => {
      this.handleMessage(msg as SocketMessage);
    });
  }

  private get protogen() {
    return this._protogen;
  }

  get sessionId() {
    return this._sessionId;
  }

  get socket() {
    return this._socket;
  }

  get auth() {
    return this._auth;
  }

  public disconnect() {
    if (!this._disconnected) {
      this.socket.disconnect();
    }
  }

  get enableAudioPreview() {
    return this._enableAudioPreview;
  }

  set enableAudioPreview(enable: boolean) {
    this._enableAudioPreview = enable;
  }

  get enableRgbPreview() {
    return this._enableRgbPreview;
  }

  get enableVisorPreview() {
    return this._enableVisorPreview;
  }

  get enableRemotePreview() {
    return this._enableRemotePreview;
  }

  sendMessage(type: SocketMessageType, data: any) {
    if (this._disconnected) {
      return;
    }

    const message: SocketMessage = {
      type: type,
      data: data,
    }

    this.socket.emit("message", message);
  }

  private handleMessage(message: SocketMessage) {
    if (message.type == null) {
      console.error("Received socket message with missing type: ", message);
      return;
    }

    const type = message.type;

    if (this.auth.onlyRemotePermissions) {
      if (type == SocketMessageType.E2S_JoystickRemoteState) {
        // Parse it as RemoteStateModel using safe parse
        const remoteState = RemoteStateModel.safeParse(message.data);
        if (!remoteState.success) {
          console.error("Rejecting invalid remote state message from socket: ", message);
          return;
        }

        const state = constructJoystickRemoteStateFromSensorData(remoteState.data);
        this.protogen.joystickRemoteManager.state = state;
      } else if (type == SocketMessageType.E2S_AudioLevel) {
        const audioLevel = AudioLevelModel.safeParse(message.data);
        if (!audioLevel.success) {
          console.error("Rejecting invalid remote audio level message from socket: ", message);
          return;
        }

        this.protogen.audioVisualiser.rawValue = audioLevel.data.level;
      } else {
        console.error("Received unauthorized message from remote: ", message);
        return;
      }
    }

    if (type == SocketMessageType.C2S_EnableRgbPreview) {
      const enable = message.data === true;
      this._enableRgbPreview = enable;
    } else if (type == SocketMessageType.C2S_EnableVisorPreview) {
      const enable = message.data === true;
      this._enableVisorPreview = enable;
    } else if (type == SocketMessageType.C2S_EnableRemotePreview) {
      const enable = message.data === true;
      this._enableRemotePreview = enable;
    } else if (type == SocketMessageType.E2S_JoystickRemoteState) {
      const state = constructJoystickRemoteStateFromSensorData(message.data);
      this.protogen.joystickRemoteManager.state = state;
    } else if (type == SocketMessageType.C2S_EnableAudioPreview) {
      const enable = message.data === true;
      this._enableAudioPreview = enable;
    } else if (type == SocketMessageType.C2S_AudioVisualiserSettings) {
      const settings = AudioVisualiserSettingsModel.safeParse(message.data);
      if (!settings.success) {
        console.error("Rejecting invalid audio visualiser settings message from socket: ", message);
        return;
      }

      this.protogen.audioVisualiser.rawAmplification = settings.data.rawAmplification;
      this.protogen.audioVisualiser.lowThreshold = settings.data.lowThreshold;
      this.protogen.audioVisualiser.highThreshold = settings.data.highThreshold;
    }
  }
}

const AudioVisualiserSettingsModel = z.object({
  rawAmplification: z.number().min(0).max(100),
  lowThreshold: z.number().min(0).max(100),
  highThreshold: z.number().min(0).max(100)
});

const AudioLevelModel = z.object({
  level: z.number().min(0).max(100)
});

const RemoteStateModel = z.object({
  joystick_x: z.number().min(0).max(1),
  joystick_y: z.number().min(0).max(1),
  joystick_pressed: z.boolean(),
  joystick_state: z.nativeEnum(JoystickRemoteControlInputType),
  button_a: z.boolean(),
  button_left: z.boolean(),
  button_right: z.boolean(),
  active_profile_id: z.number().int().nullable().optional()
});
