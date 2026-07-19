export interface WifiNetworkProfile {
  uuid: string;
  name: string;
  ssid: string;
  security: "wpa-psk" | "open" | "unknown";
  autoconnect: boolean;
  autoconnectPriority: number;
  status: "disconnected" | "connecting" | "connected";
  connected: boolean;
  device: string | null;
}

export interface WifiCredentials {
  name: string;
  ssid: string;
  security: "wpa-psk" | "open";
  password?: string;
  autoconnect: boolean;
  autoconnectPriority: number;
}
