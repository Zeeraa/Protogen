import { Protogen } from "../Protogen";
import { KV_RemoteFlipAxis, KV_RemoteInvertX, KV_RemoteInvertY } from "../utils/KVDataStorageKeys";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";
import { RemoteState } from "./RemoteState";
import { RemoteControlInputType } from "../database/models/remote/RemoteControlInputType";
import { uuidv7 } from "uuidv7";

export class RemoteManager {
  private _protogen;
  private _state: RemoteState;
  private _stateReportingKey: string;
  public invertX: boolean;
  public invertY: boolean;
  public flipAxis: boolean;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._state = {
      state: RemoteControlInputType.JOYSTICK_CENTER,
      activeProfileId: -1,
      buttonA: false,
      buttonLeft: false,
      buttonRight: false,
      joystickPressed: false,
      joystickX: 0.5,
      joystickY: 0.5,
    }

    this._stateReportingKey = uuidv7();
    this.invertX = false;
    this.invertY = false;
    this.flipAxis = false;
  }

  public get stateReportingKey() {
    return this._stateReportingKey;
  }

  public async loadConfig() {
    await this.protogen.database.initMissingData(KV_RemoteInvertX, "false");
    await this.protogen.database.initMissingData(KV_RemoteInvertY, "false");
    await this.protogen.database.initMissingData(KV_RemoteFlipAxis, "false");

    this.invertX = await this.protogen.database.getData(KV_RemoteInvertX) == "true";
    this.invertY = await this.protogen.database.getData(KV_RemoteInvertY) == "true";
    this.flipAxis = await this.protogen.database.getData(KV_RemoteFlipAxis) == "true";
  }

  public async saveConfig() {
    await this.protogen.database.setData(KV_RemoteInvertX, String(this.invertX));
    await this.protogen.database.setData(KV_RemoteInvertY, String(this.invertY));
    await this.protogen.database.setData(KV_RemoteFlipAxis, String(this.flipAxis));
  }

  get protogen() {
    return this._protogen;
  }

  get state() {
    return this._state;
  }

  set state(state: RemoteState) {
    this._state = state;
    this.protogen.webServer.socketSessions.filter(s => s.enableRemotePreview).forEach(subscriber => {
      subscriber.sendMessage(SocketMessageType.S2C_RemoteState, state);
    })
  }
}
