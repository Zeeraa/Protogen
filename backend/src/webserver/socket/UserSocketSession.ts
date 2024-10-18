import { uuidv7 } from "uuidv7";
import { Protogen } from "../../Protogen";
import { Socket } from "socket.io";

export class UserSocketSession {
  private _protogen;
  private _sessionId: string;
  private _socket;
  private _disconnected = false;

  constructor(protogen: Protogen, socket: Socket) {
    this._protogen = protogen;
    this._sessionId = uuidv7();
    this._socket = socket;

    socket.on("disconnect", () => {
      this._disconnected = true;
      this.protogen.webServer.disconnectSocket(this);
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
}