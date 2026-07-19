import { WifiNetworkProfile } from "./WifiNetworkProfile";

export abstract class WifiConfigProvider {
  /**
   * Get all saved Wi-Fi connection profiles in the system
   */
  public abstract getSavedNetworks(): Promise<WifiNetworkProfile[]>;

  /**
   * Add a new Wi-Fi connection profile
   */
  public abstract addNetwork(
    name: string,
    ssid: string,
    security: "wpa-psk" | "open",
    password?: string,
    autoconnect?: boolean,
    autoconnectPriority?: number
  ): Promise<string>;

  /**
   * Edit an existing Wi-Fi connection profile
   */
  public abstract editNetwork(
    uuid: string,
    name: string,
    ssid: string,
    security: "wpa-psk" | "open",
    password?: string,
    autoconnect?: boolean,
    autoconnectPriority?: number
  ): Promise<void>;

  /**
   * Delete a Wi-Fi connection profile by UUID
   */
  public abstract deleteNetwork(uuid: string): Promise<void>;

  /**
   * Connect (up/activate) a Wi-Fi connection profile
   */
  public abstract connectNetwork(uuid: string): Promise<void>;

  /**
   * Disconnect (down) a Wi-Fi connection profile
   */
  public abstract disconnectNetwork(uuid: string): Promise<void>;
}
