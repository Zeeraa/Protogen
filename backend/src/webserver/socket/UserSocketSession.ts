import { uuidv7 } from "uuidv7";
import { Protogen } from "../../Protogen";
import { Socket } from "socket.io";
import { SocketMessageType } from "./SocketMessageType";
import { SocketMessage } from "./SocketMessage";
import { AuthData } from "../middleware/AuthMiddleware";
import { z } from "zod";

export class UserSocketSession {
  private _protogen;
  private _sessionId: string;
  private _socket;
  private _disconnected = false;
  private _enableRgbPreview = false;
  private _enableVisorPreview = false;
  private _enableAudioPreview = false;
  private _enableGamepadPreview = false;
  private _enableDevData = false;
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

  public get sessionId() {
    return this._sessionId;
  }

  public get socket() {
    return this._socket;
  }

  public get auth() {
    return this._auth;
  }

  public disconnect() {
    if (!this._disconnected) {
      this.socket.disconnect();
    }
  }

  public get enableAudioPreview() {
    return this._enableAudioPreview;
  }

  public set enableAudioPreview(enable: boolean) {
    this._enableAudioPreview = enable;
  }

  public get enableRgbPreview() {
    return this._enableRgbPreview;
  }

  public get enableVisorPreview() {
    return this._enableVisorPreview;
  }

  public get enableDevData() {
    return this._enableDevData;
  }

  public get enableGamepadPreview() {
    return this._enableGamepadPreview;
  }

  public set enableGamepadPreview(enable: boolean) {
    this._enableGamepadPreview = enable;
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

    if (type == SocketMessageType.C2S_EnableRgbPreview) {
      const enable = message.data === true;
      this._enableRgbPreview = enable;
    } else if (type == SocketMessageType.C2S_EnableVisorPreview) {
      const enable = message.data === true;
      this._enableVisorPreview = enable;
    } else if (type == SocketMessageType.C2S_EnableAudioPreview) {
      const enable = message.data === true;
      this._enableAudioPreview = enable;
    } else if (type == SocketMessageType.C2S_EnableDevData) {
      const enable = message.data === true;
      this._enableDevData = enable;
    } else if (type == SocketMessageType.C2S_EnableGamepadPreview) {
      const enable = message.data === true;
      this._enableGamepadPreview = enable;
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