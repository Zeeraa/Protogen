import axios from "axios";
import { Protogen } from "../Protogen";

/**
 * Manages network connectivity status
 */
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

  /**
   * Checks the network connectivity and update isp info.
   */
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
    } catch (_err) {
      if (this._hasConnectivity) {
        this._hasConnectivity = false;
        this.protogen.logger.info("NetworkManager", "Network connectivity changed to: Unreachable");
      }
      this._ip = null;
    }
  }

  /**
   * Check if the device has network connectivity.
   * @returns True if the device has network connectivity, false otherwise.
   */
  public get hasConnectivity() {
    return this._hasConnectivity;
  }

  /**
   * Get the current public IP address.
   * @return The public IP address or null if not available.
   */
  public get ip() {
    return this._ip;
  }

  /**
   * Get the current ISP information.
   * @return The ISP name or null if not available.
   */
  public get isp() {
    return this._isp;
  }
}
