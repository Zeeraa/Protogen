import { uuidv7 } from "uuidv7";
import { Protogen } from "../../Protogen";
import { Socket } from "socket.io";
import { AbstractApp } from "../../apps/AbstractApp";
import { z } from "zod";

export class AppUserSocketSession {
  private _protogen;
  private _socket;
  private _sessionId: string;
  private _app: AbstractApp;
  private _interactionKey: string;
  private _disconnected = false;

  constructor(protogen: Protogen, socket: Socket, app: AbstractApp, interactionKey: string) {
    this._protogen = protogen;
    this._socket = socket;
    this._app = app;
    this._interactionKey = interactionKey;
    this._sessionId = uuidv7();

    socket.on("disconnect", () => {
      this._disconnected = true;
      this.protogen.webServer.disconnectAppSocket(this);
    });

    this._socket.on('message', async (msg: AppSocketPacket<any>) => {
      const result = PacketModel.safeParse(msg);
      if (!result.success) {
        console.error("Invalid packet received on app socket:", result.error, "Session id: " + this.sessionId);
        return;
      }

      await this.app.onAppMessage(msg);
    });
  }

  public sendMessage(msg: AppSocketPacket<any>) {
    if (this._disconnected) {
      return;
    }
    this.socket.emit("message", msg);
  }

  public disconnect() {
    if (!this._disconnected) {
      this.socket.disconnect();
    }
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

  public get app() {
    return this._app;
  }

  public get interactionKey() {
    return this._interactionKey;
  }
}

const PacketModel = z.object({
  type: z.string().min(1),
  data: z.any(),
});

export interface AppSocketPacket<T> {
  type: string;
  data: T;
}
