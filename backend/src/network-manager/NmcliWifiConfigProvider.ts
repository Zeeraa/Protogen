import { execFile } from "child_process";
import { promisify } from "util";
import { WifiConfigProvider } from "./WifiConfigProvider";
import { WifiNetworkProfile } from "./WifiNetworkProfile";
import { WifiError } from "./WifiError";

const execFileAsync = promisify(execFile);

export class NmcliWifiConfigProvider extends WifiConfigProvider {
  /**
   * Get all saved Wi-Fi connection profiles in the system via nmcli
   */
  public async getSavedNetworks(): Promise<WifiNetworkProfile[]> {
    try {
      // Get device states of any active wifi interface to check for connecting/activating states
      const activeWifiConnections = new Map<string, "connected" | "connecting" | "disconnected">();
      try {
        const { stdout: devStdout } = await execFileAsync("sudo", [
          "-n",
          "nmcli",
          "-t",
          "-f",
          "DEVICE,STATE,CONNECTION",
          "device",
          "status"
        ]);
        const devLines = devStdout.trim().split(/\r?\n/);
        for (const line of devLines) {
          if (!line.trim()) continue;
          const parts = line.split(":");
          if (parts.length >= 3) {
            const devTypeStdout = await execFileAsync("sudo", [
              "-n",
              "nmcli",
              "-t",
              "-f",
              "GENERAL.TYPE",
              "device",
              "show",
              parts[0]
            ]).catch(() => ({ stdout: "" }));

            if (devTypeStdout.stdout.includes("wifi")) {
              const state = parts[1].trim();
              const connectionName = parts[2].trim();
              if (connectionName && connectionName !== "--") {
                if (state === "connecting" || state === "checking" || state.includes("config")) {
                  activeWifiConnections.set(connectionName, "connecting");
                } else if (state === "connected") {
                  activeWifiConnections.set(connectionName, "connected");
                }
              }
            }
          }
        }
      } catch (_e) {
        // Fallback or ignore if device status fetch fails
      }

      // List all connections with subset of columns
      const { stdout } = await execFileAsync("sudo", [
        "-n",
        "nmcli",
        "-t",
        "-f",
        "NAME,UUID,TYPE,AUTOCONNECT,ACTIVE,DEVICE",
        "connection",
        "show"
      ]);

      const lines = stdout.trim().split(/\r?\n/);
      const profiles: WifiNetworkProfile[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(":");
        if (parts.length < 6) continue;

        const device = parts[parts.length - 1] === "--" ? null : (parts[parts.length - 1] || null);
        const active = parts[parts.length - 2];
        const autoconnectStr = parts[parts.length - 3];
        const type = parts[parts.length - 4];
        const uuid = parts[parts.length - 5];
        const name = parts.slice(0, parts.length - 5).join(":");

        if (type !== "802-11-wireless") {
          continue;
        }

        const connected = active === "yes";
        const autoconnect = autoconnectStr === "yes";

        // Query detailed info for the SSID and key-mgmt of this connection profile
        let ssid = name;
        let security: "wpa-psk" | "open" | "unknown" = "unknown";
        let autoconnectPriority = 0;

        try {
          const { stdout: detailStdout } = await execFileAsync("sudo", [
            "-n",
            "nmcli",
            "-g",
            "802-11-wireless.ssid,connection.autoconnect,802-11-wireless-security.key-mgmt,connection.autoconnect-priority",
            "connection",
            "show",
            uuid
          ]);

          const detailedLines = detailStdout.trim().split(/\r?\n/);
          ssid = detailedLines[0] || name;
          const keyMgmt = detailedLines[2] ? detailedLines[2].trim() : "";
          const priorityStr = detailedLines[3] ? detailedLines[3].trim() : "0";
          autoconnectPriority = parseInt(priorityStr, 10) || 0;

          if (keyMgmt === "wpa-psk") {
            security = "wpa-psk";
          } else if (keyMgmt === "") {
            security = "open";
          } else {
            security = "unknown";
          }
        } catch (_err) {
          // Fallback if detail query fails, keep defaults
        }

        // Determine if connected, connecting, or disconnected
        let status: "disconnected" | "connecting" | "connected" = "disconnected";

        // Check our activeWifiConnections parsed map first to check for "connecting" or "connected" overlay
        if (activeWifiConnections.has(name)) {
          status = activeWifiConnections.get(name)!;
        } else if (activeWifiConnections.has(uuid)) {
          status = activeWifiConnections.get(uuid)!;
        } else if (connected) {
          status = "connected";
        } else if (active && active !== "no") {
          if (active === "yes") {
            status = "connected";
          } else if (active.includes("acting") || active.includes("activating")) {
            status = "connecting";
          }
        }

        profiles.push({
          uuid,
          name,
          ssid,
          security,
          autoconnect,
          autoconnectPriority,
          status,
          connected: status === "connected",
          device
        });
      }

      return profiles;
    } catch (err) {
      this.handleException(err, "list saved Wi-Fi networks");
    }
  }

  /**
   * Add a new Wi-Fi connection profile
   */
  public async addNetwork(
    name: string,
    ssid: string,
    security: "wpa-psk" | "open",
    password?: string,
    autoconnect: boolean = true,
    autoconnectPriority: number = 0
  ): Promise<string> {
    try {
      const args = [
        "-n",
        "nmcli",
        "connection",
        "add",
        "type",
        "wifi",
        "con-name",
        name,
        "ssid",
        ssid,
        "connection.autoconnect",
        autoconnect ? "yes" : "no",
        "connection.autoconnect-priority",
        String(autoconnectPriority)
      ];

      if (security === "wpa-psk" && password) {
        args.push("--", "wifi-sec.key-mgmt", "wpa-psk", "wifi-sec.psk", password);
      }

      const { stdout } = await execFileAsync("sudo", args);

      // Try to parse the UUID from nmcli output, e.g. "Connection 'Name' (UUID) successfully added."
      const uuidMatch = stdout.match(/\(([a-fA-F0-9-]{36})\)/);
      if (uuidMatch && uuidMatch[1]) {
        return uuidMatch[1];
      }
      return name;
    } catch (err) {
      this.handleException(err, "add Wi-Fi network");
    }
  }

  /**
   * Edit an existing Wi-Fi connection profile
   */
  public async editNetwork(
    uuid: string,
    name: string,
    ssid: string,
    security: "wpa-psk" | "open",
    password?: string,
    autoconnect: boolean = true,
    autoconnectPriority: number = 0
  ): Promise<void> {
    try {
      // Modify base connection properties
      await execFileAsync("sudo", [
        "-n",
        "nmcli",
        "connection",
        "modify",
        uuid,
        "connection.id",
        name,
        "802-11-wireless.ssid",
        ssid,
        "connection.autoconnect",
        autoconnect ? "yes" : "no",
        "connection.autoconnect-priority",
        String(autoconnectPriority)
      ]);

      if (security === "wpa-psk") {
        if (password && password !== "********") {
          await execFileAsync("sudo", [
            "-n",
            "nmcli",
            "connection",
            "modify",
            uuid,
            "wifi-sec.key-mgmt",
            "wpa-psk",
            "wifi-sec.psk",
            password
          ]);
        } else {
          // Ensure key-mgmt is wpa-psk even if no new password is set
          await execFileAsync("sudo", [
            "-n",
            "nmcli",
            "connection",
            "modify",
            uuid,
            "wifi-sec.key-mgmt",
            "wpa-psk"
          ]);
        }
      } else {
        // Clear security settings (WPA-PSK -> Open)
        // nmcli modify uuid remove wifi-sec
        await execFileAsync("sudo", [
          "-n",
          "nmcli",
          "connection",
          "modify",
          uuid,
          "remove",
          "wifi-sec"
        ]);
      }
    } catch (err) {
      this.handleException(err, "edit Wi-Fi network");
    }
  }

  /**
   * Delete a Wi-Fi connection profile by UUID
   */
  public async deleteNetwork(uuid: string): Promise<void> {
    try {
      await execFileAsync("sudo", ["-n", "nmcli", "connection", "delete", uuid]);
    } catch (err) {
      this.handleException(err, "delete Wi-Fi network");
    }
  }

  /**
   * Connect (up/activate) a Wi-Fi connection profile
   */
  public async connectNetwork(uuid: string): Promise<void> {
    try {
      await execFileAsync("sudo", ["-n", "nmcli", "connection", "up", "uuid", uuid]);
    } catch (err) {
      this.handleException(err, "connect Wi-Fi network");
    }
  }

  /**
   * Disconnect (down) a Wi-Fi connection profile
   */
  public async disconnectNetwork(uuid: string): Promise<void> {
    try {
      await execFileAsync("sudo", ["-n", "nmcli", "connection", "down", "uuid", uuid]);
    } catch (err) {
      this.handleException(err, "disconnect Wi-Fi network");
    }
  }

  private handleException(err: any, context: string): never {
    const stderrMsg = err.stderr ? err.stderr.trim() : "";
    const msg = stderrMsg || err.message || String(err);
    throw new WifiError(`Failed to ${context}: ${msg}`);
  }
}
