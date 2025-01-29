import { uuidv7 } from "uuidv7";
import { Protogen } from "../../Protogen";
import { Socket } from "socket.io";
import { SocketMessageType } from "./SocketMessageType";
import { SocketMessage } from "./SocketMessage";

export class UserSocketSession {
  private _protogen;
  private _sessionId: string;
  private _socket;
  private _disconnected = false;
  private _enableRgbPreview = false;
  private _enableVisorPreview = false;

  constructor(protogen: Protogen, socket: Socket) {
    this._protogen = protogen;
    this._sessionId = uuidv7();
    this._socket = socket;

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

    console.log(message);

    if (type == SocketMessageType.C2S_EnableRgbPreview) {
      const enable = message.data === true;
      //if (this._enableRgbPreview != enable) {
      //  console.log("Socket " + this.sessionId + " " + (enable ? "enabled" : "disabled") + " rgb preview");
      //}
      this._enableRgbPreview = enable;

    } else if (type == SocketMessageType.C2S_EnableVisorPreview) {
      const enable = message.data === true;
      //if (this._enableVisorPreview != enable) {
      //  console.log("Socket " + this.sessionId + " " + (enable ? "enabled" : "disabled") + " visor preview");
      //}
      this._enableVisorPreview = enable;
    }

  }
}