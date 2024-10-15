import axios from "axios";
import { Protogen } from "../Protogen";

export class NetworkManager {
  private _protogen: Protogen;
  private _hasConnectivity: boolean = false;
  private _ip: string | null = null;
  private _isp: string | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    setInterval(() => {
      this.runConnectivityCheck();
    }, 1000 * 20);
  }

  private get protogen() {
    return this._protogen;
  }

  public async runConnectivityCheck() {
    try {
      const response = await axios.get("https://wtfismyip.com/json", { timeout: 20 * 1000 });
      const ip = response.data.YourFuckingIPAddress;
      const isp = response.data.YourFuckingISP;
      if (ip != undefined) {
        if (!this._hasConnectivity) {
          this._hasConnectivity = true;
          this.protogen.logger.info("NetworkManager", "Network connectivity changed to: OK");
        }
        this._ip = String(ip);

        if (isp != null) {
          this._isp = String(isp);
        }
      } else {
        throw Error("Failed to extract ip value");
      }
    } catch (err) {
      if (this._hasConnectivity) {
        this._hasConnectivity = false;
        this.protogen.logger.info("NetworkManager", "Network connectivity changed to: Unreachable");
      }
      this._ip = null;
    }
  }

  public get hasConnectivity() {
    return this._hasConnectivity;
  }

  public get ip() {
    return this._ip;
  }

  public get isp() {
    return this._isp;
  }
}