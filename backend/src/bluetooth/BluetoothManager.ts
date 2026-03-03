import { exec } from "child_process";
import { promisify } from "util";
import { Protogen } from "../Protogen";
import { BluetoothDevice } from "./BluetoothDevice";
import { BluetoothError } from "./BluetoothError";

const execAsync = promisify(exec);

/**
 * Manages Bluetooth operations via bluetoothctl.
 */
export class BluetoothManager {
  private readonly _protogen: Protogen;
  private _scanning: boolean = false;
  private _scanTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  private get protogen() {
    return this._protogen;
  }

  /**
   * Run a bluetoothctl command and return stdout.
   * On failure, parses stdout/stderr for a meaningful message and throws BluetoothError.
   */
  private async btctl(args: string, timeoutMs: number = 15000): Promise<string> {
    try {
      const { stdout } = await execAsync(`bluetoothctl ${args}`, { timeout: timeoutMs });
      return stdout.trim();
    } catch (err: any) {
      // execAsync rejects on non-zero exit code — pull the message from stdout
      const output = (err.stdout || "").trim();
      const stderr = (err.stderr || "").trim();
      const combined = output || stderr || "Unknown bluetoothctl error";

      // Parse common bluetoothctl error patterns
      if (combined.includes("not available")) {
        throw new BluetoothError("Device not available. Make sure to scan for devices first and that the device is in range and discoverable.", 404);
      }
      if (combined.includes("No default controller available")) {
        throw new BluetoothError("No Bluetooth adapter found on this device.", 503);
      }
      if (combined.includes("Already exists")) {
        throw new BluetoothError("Device is already paired.", 409);
      }
      if (combined.includes("Not connected")) {
        throw new BluetoothError("Device is not connected.", 409);
      }
      if (combined.includes("Already connected")) {
        throw new BluetoothError("Device is already connected.", 409);
      }
      if (combined.includes("Does Not Exist")) {
        throw new BluetoothError("Device not found in paired devices.", 404);
      }
      if (combined.includes("Failed to pair")) {
        throw new BluetoothError("Failed to pair with device. Make sure the device is in pairing mode.", 400);
      }
      if (combined.includes("Failed to connect")) {
        throw new BluetoothError("Failed to connect to device.", 400);
      }

      // Re-throw with the actual output as the message
      throw new BluetoothError(combined, 500);
    }
  }

  /**
   * Parse a single device info block from `bluetoothctl info <mac>`.
   */
  private parseDeviceInfo(mac: string, block: string): BluetoothDevice {
    const nameMatch = block.match(/Name:\s*(.+)/);
    const aliasMatch = block.match(/Alias:\s*(.+)/);
    const pairedMatch = block.match(/Paired:\s*(yes|no)/);
    const connectedMatch = block.match(/Connected:\s*(yes|no)/);
    const trustedMatch = block.match(/Trusted:\s*(yes|no)/);

    return {
      macAddress: mac,
      name: nameMatch?.[1]?.trim() || aliasMatch?.[1]?.trim() || mac,
      paired: pairedMatch?.[1] === "yes",
      connected: connectedMatch?.[1] === "yes",
      trusted: trustedMatch?.[1] === "yes",
    };
  }

  /**
   * Get detailed info for a single device by MAC address.
   */
  public async getDeviceInfo(mac: string): Promise<BluetoothDevice | null> {
    try {
      const output = await this.btctl(`info ${mac}`);
      if (output.includes("not available")) {
        return null;
      }
      return this.parseDeviceInfo(mac, output);
    } catch {
      return null;
    }
  }

  /**
   * List all paired devices.
   */
  public async getPairedDevices(): Promise<BluetoothDevice[]> {
    const output = await this.btctl("devices Paired");
    return this.parseDeviceList(output);
  }

  /**
   * Parse a list of devices from bluetoothctl output.
   * Lines are formatted as: "Device XX:XX:XX:XX:XX:XX DeviceName"
   */
  private async parseDeviceList(output: string): Promise<BluetoothDevice[]> {
    const lines = output.split("\n").filter(l => l.startsWith("Device "));
    const devices: BluetoothDevice[] = [];

    for (const line of lines) {
      const parts = line.match(/^Device\s+([0-9A-Fa-f:]{17})\s+(.*)$/);
      if (!parts) continue;

      const mac = parts[1];
      const info = await this.getDeviceInfo(mac);
      if (info) {
        devices.push(info);
      } else {
        devices.push({
          macAddress: mac,
          name: parts[2] || mac,
          paired: false,
          connected: false,
          trusted: false,
        });
      }
    }

    return devices;
  }

  /**
   * Start scanning for nearby Bluetooth devices.
   * Scanning runs for the specified duration in seconds (default 10).
   */
  public async startScan(durationSeconds: number = 10): Promise<void> {
    if (this._scanning) {
      return;
    }
    this._scanning = true;
    this.protogen.logger.info("BluetoothManager", "Starting Bluetooth scan for " + durationSeconds + "s");

    try {
      // Give execAsync enough time: scan duration + 5s buffer
      await this.btctl("--timeout " + durationSeconds + " scan on", (durationSeconds + 5) * 1000);
    } catch {
      // scan on exits with error when timeout expires — this is expected
    } finally {
      this._scanning = false;
      this._scanTimeout = null;
    }
  }

  /**
   * Stop an in-progress scan.
   */
  public async stopScan(): Promise<void> {
    if (this._scanTimeout) {
      clearTimeout(this._scanTimeout);
      this._scanTimeout = null;
    }
    try {
      await this.btctl("scan off");
    } catch {
      // Ignore if scan wasn't running
    }
    this._scanning = false;
  }

  /**
   * Get all discovered (available) devices from the most recent scan.
   */
  public async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    const output = await this.btctl("devices");
    return this.parseDeviceList(output);
  }

  /**
   * Whether a scan is currently in progress.
   */
  public get isScanning(): boolean {
    return this._scanning;
  }

  /**
   * Pair with a device by MAC address.
   * Sets up a NoInputNoOutput agent for headless pairing.
   */
  public async pairDevice(mac: string): Promise<void> {
    this.protogen.logger.info("BluetoothManager", "Pairing with device: " + mac);
    // Use agent NoInputNoOutput for headless pairing (no PIN prompt)
    await this.btctl(`agent NoInputNoOutput`).catch(() => { });
    await this.btctl(`default-agent`).catch(() => { });
    await this.btctl(`pair ${mac}`);
    // Trust the device automatically so it can reconnect
    await this.btctl(`trust ${mac}`);
  }

  /**
   * Unpair (remove) a device by MAC address.
   */
  public async unpairDevice(mac: string): Promise<void> {
    this.protogen.logger.info("BluetoothManager", "Unpairing device: " + mac);
    await this.btctl(`remove ${mac}`);
  }

  /**
   * Connect to a paired device by MAC address.
   */
  public async connectDevice(mac: string): Promise<void> {
    this.protogen.logger.info("BluetoothManager", "Connecting to device: " + mac);
    await this.btctl(`connect ${mac}`);
  }

  /**
   * Disconnect from a device by MAC address.
   */
  public async disconnectDevice(mac: string): Promise<void> {
    this.protogen.logger.info("BluetoothManager", "Disconnecting from device: " + mac);
    await this.btctl(`disconnect ${mac}`);
  }
}
