import { uuidv7 } from "uuidv7";
import { Protogen } from "../../Protogen";
import { Socket } from "socket.io";
import { SocketMessageType } from "./SocketMessageType";
import { SocketMessage } from "./SocketMessage";
import { constructRemoteStateFromSensorData } from "../../remote/RemoteState";
import { AuthData } from "../middleware/AuthMiddleware";
import { z } from "zod";
import { RemoteControlInputType } from "../../database/models/remote/RemoteControlInputType";

export class UserSocketSession {
  private _protogen;
  private _sessionId: string;
  private _socket;
  private _disconnected = false;
  private _enableRgbPreview = false;
  private _enableVisorPreview = false;
  private _enableRemotePreview = false;
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
      if (type != SocketMessageType.E2S_RemoteState) {
        console.error("Received unauthorized message from remote: ", message);
        return;
      }

      // Parse it as RemoteStateModel using safe parse
      const remoteState = RemoteStateModel.safeParse(message.data);
      if (!remoteState.success) {
        console.error("Rejecting invalid remote state message from socket: ", message);
        return;
      }

      const state = constructRemoteStateFromSensorData(remoteState.data);
      this.protogen.remoteManager.state = state;

      return;
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
    } else if (type == SocketMessageType.E2S_RemoteState) {
      const state = constructRemoteStateFromSensorData(message.data);
      this.protogen.remoteManager.state = state;
    }
  }
}

const RemoteStateModel = z.object({
  joystick_x: z.number().min(0).max(1),
  joystick_y: z.number().min(0).max(1),
  joystick_pressed: z.boolean(),
  joystick_state: z.nativeEnum(RemoteControlInputType),
  button_a: z.boolean(),
  button_left: z.boolean(),
  button_right: z.boolean(),
  active_profile_id: z.number().int().nullable().optional()
});
