import { ChildProcess, exec, spawn } from "child_process";
import { promisify } from "util";
import { Protogen } from "../Protogen";
import { BluetoothDevice } from "./BluetoothDevice";
import { BluetoothError } from "./BluetoothError";

const execAsync = promisify(exec);

const DEVICE_LINE_RE = /^Device\s+([0-9A-Fa-f:]{17})\s+(.*)$/;

/**
 * Manages Bluetooth operations by wrapping the Linux `bluetoothctl` CLI.
 *
 * Design decisions:
 * - Simple one-shot commands (info, trust, remove, connect, disconnect) use
 *   `exec()` — one process per call, no session state needed.
 * - Scanning uses a background `spawn()` process so it returns immediately
 *   instead of blocking for the scan duration.
 * - Pairing uses an interactive `spawn()` session so `agent`, `default-agent`,
 *   and `pair` all execute in the same bluetoothctl instance — this is
 *   required because agent registration is per-session.
 * - Device list enrichment runs info lookups in parallel via
 *   `Promise.allSettled` instead of sequentially.
 */
export class BluetoothManager {
  private readonly _protogen: Protogen;
  private _scanning: boolean = false;
  private _scanProcess: ChildProcess | null = null;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
  }

  // ---------------------------------------------------------------------------
  //  Low-level helpers
  // ---------------------------------------------------------------------------

  /**
   * Execute a single bluetoothctl command and return trimmed stdout.
   * Throws {@link BluetoothError} with an appropriate HTTP status on failure.
   */
  private async exec(args: string, timeoutMs: number = 15_000): Promise<string> {
    try {
      const { stdout } = await execAsync(`bluetoothctl ${args}`, { timeout: timeoutMs });
      return stdout.trim();
    } catch (err: any) {
      const text =
        ((err.stdout ?? "") as string).trim() ||
        ((err.stderr ?? "") as string).trim() ||
        "Unknown bluetoothctl error";
      throw this.classify(text);
    }
  }

  /**
   * Run an interactive bluetoothctl session.
   *
   * Commands are written to stdin sequentially with a short delay so
   * bluetoothctl can process each one. An optional `resolvePattern` lets the
   * caller resolve early when specific output is seen (e.g. "Pairing
   * successful"). Agent pairing confirmations are auto-accepted.
   */
  private runSession(
    commands: string[],
    opts: {
      timeoutMs?: number;
      resolvePattern?: RegExp;
      autoAcceptPairing?: boolean;
    } = {},
  ): Promise<string> {
    const {
      timeoutMs = 30_000,
      resolvePattern,
      autoAcceptPairing = false,
    } = opts;

    return new Promise<string>((resolve, reject) => {
      const proc = spawn("bluetoothctl", [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let settled = false;

      // ---- settlement helpers -----------------------------------------------
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          proc.kill();
        } catch {
          /* already dead */
        }
        fn();
      };

      const timer = setTimeout(() => {
        finish(() =>
          reject(new BluetoothError("Bluetooth operation timed out.", 504)),
        );
      }, timeoutMs);

      // ---- stdout -----------------------------------------------------------
      proc.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;

        // Auto-accept agent pairing prompts
        if (autoAcceptPairing && /\[agent\].*\(yes\/no\)/i.test(text)) {
          proc.stdin?.write("yes\n");
        }

        // Resolve early when the caller's pattern matches
        if (resolvePattern?.test(output)) {
          // Grace period to capture trailing output
          setTimeout(() => finish(() => resolve(output.trim())), 500);
        }
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });

      // ---- lifecycle --------------------------------------------------------
      proc.on("error", (err) => {
        finish(() =>
          reject(
            new BluetoothError(
              `Failed to start bluetoothctl: ${err.message}`,
              500,
            ),
          ),
        );
      });

      proc.on("close", () => {
        finish(() => {
          const error = this.findError(output);
          if (error) {
            reject(error);
            return;
          }
          resolve(output.trim());
        });
      });

      // ---- send commands sequentially ---------------------------------------
      const send = async () => {
        for (const cmd of commands) {
          proc.stdin?.write(cmd + "\n");
          await sleep(400);
        }

        if (!resolvePattern) {
          // No pattern to wait for — give bluetoothctl a moment then close.
          await sleep(2_000);
          finish(() => {
            const error = this.findError(output);
            if (error) {
              reject(error);
              return;
            }
            resolve(output.trim());
          });
        }
      };
      send();
    });
  }

  // ---------------------------------------------------------------------------
  //  Error handling
  // ---------------------------------------------------------------------------

  /**
   * Known bluetoothctl error patterns mapped to human-readable messages and
   * appropriate HTTP status codes.
   */
  private static readonly ERROR_MAP: ReadonlyArray<
    [test: string, message: string, status: number]
  > = [
      [
        "No default controller available",
        "No Bluetooth adapter found on this device.",
        503,
      ],
      [
        "not available",
        "Device not available. Scan for devices first and ensure the target is in range.",
        404,
      ],
      ["Already exists", "Device is already paired.", 409],
      ["Not connected", "Device is not connected.", 409],
      ["Already connected", "Device is already connected.", 409],
      ["Does Not Exist", "Device not found in paired devices.", 404],
      [
        "ConnectionAttemptFailed",
        "Connection attempt failed. Ensure the device is in pairing mode and in range.",
        400,
      ],
      [
        "Failed to pair",
        "Failed to pair with device. Make sure the device is in pairing mode.",
        400,
      ],
      ["Failed to connect", "Failed to connect to device.", 400],
    ];

  /**
   * Turn raw bluetoothctl output into a typed {@link BluetoothError}.
   * Falls back to a generic 500 error when no known pattern matches.
   */
  private classify(text: string): BluetoothError {
    for (const [test, message, status] of BluetoothManager.ERROR_MAP) {
      if (text.includes(test)) return new BluetoothError(message, status);
    }
    return new BluetoothError(text, 500);
  }

  /**
   * Scan output for known fatal error patterns. Returns the matching
   * {@link BluetoothError} or `null` if everything looks fine.
   */
  private findError(output: string): BluetoothError | null {
    const fatalPatterns = [
      "No default controller available",
      "ConnectionAttemptFailed",
      "Failed to pair",
      "Failed to connect",
    ];
    for (const pattern of fatalPatterns) {
      if (output.includes(pattern)) return this.classify(output);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  //  Parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse a device info block returned by `bluetoothctl info <mac>`.
   */
  private parseDeviceInfo(mac: string, block: string): BluetoothDevice {
    const field = (key: string) =>
      block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim();

    return {
      macAddress: mac,
      name: field("Name") ?? field("Alias") ?? mac,
      paired: field("Paired") === "yes",
      connected: field("Connected") === "yes",
      trusted: field("Trusted") === "yes",
    };
  }

  /**
   * Extract `Device XX:XX:XX:XX:XX:XX Name` lines from bluetoothctl output.
   */
  private parseDeviceLines(
    output: string,
  ): { mac: string; name: string }[] {
    return output
      .split("\n")
      .map((line) => line.match(DEVICE_LINE_RE))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => ({ mac: m[1], name: m[2] }));
  }

  /**
   * Parse a device list and fetch full info for each device **in parallel**.
   */
  private async enrichDeviceList(output: string): Promise<BluetoothDevice[]> {
    const stubs = this.parseDeviceLines(output);

    const results = await Promise.allSettled(
      stubs.map(async ({ mac, name }) => {
        const info = await this.getDeviceInfo(mac);
        return (
          info ?? {
            macAddress: mac,
            name,
            paired: false,
            connected: false,
            trusted: false,
          }
        );
      }),
    );

    const devices = results
      .filter(
        (r): r is PromiseFulfilledResult<BluetoothDevice> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    // Devices with a real name first, MAC-only names last
    const MAC_RE = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;
    devices.sort((a, b) => {
      const aHasName = !MAC_RE.test(a.name);
      const bHasName = !MAC_RE.test(b.name);
      if (aHasName !== bHasName) return aHasName ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return devices;
  }

  // ---------------------------------------------------------------------------
  //  Public API
  // ---------------------------------------------------------------------------

  /** Whether a scan is currently in progress. */
  public get isScanning(): boolean {
    return this._scanning;
  }

  /**
   * Get detailed info for a single device by MAC address.
   * Returns `null` if the device is unknown to bluetoothctl.
   */
  public async getDeviceInfo(mac: string): Promise<BluetoothDevice | null> {
    try {
      const output = await this.exec(`info ${mac}`);
      if (output.includes("not available")) return null;
      return this.parseDeviceInfo(mac, output);
    } catch {
      return null;
    }
  }

  /**
   * List all paired Bluetooth devices with full info.
   */
  public async getPairedDevices(): Promise<BluetoothDevice[]> {
    const output = await this.exec("devices Paired");
    return this.enrichDeviceList(output);
  }

  /**
   * List all discovered devices from the most recent scan.
   */
  public async getDiscoveredDevices(): Promise<BluetoothDevice[]> {
    const output = await this.exec("devices");
    return this.enrichDeviceList(output);
  }

  /**
   * Start scanning for nearby Bluetooth devices.
   *
   * The scan runs in a **background process** and returns immediately so the
   * caller is not blocked for the full duration. The process self-terminates
   * after `durationSeconds` via bluetoothctl's `--timeout` flag.
   */
  public async startScan(durationSeconds: number = 10): Promise<void> {
    if (this._scanning) return;
    this._scanning = true;
    this._protogen.logger.info(
      "BluetoothManager",
      `Starting Bluetooth scan for ${durationSeconds}s`,
    );

    const proc = spawn(
      "bluetoothctl",
      ["--timeout", String(durationSeconds), "scan", "on"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    this._scanProcess = proc;

    proc.on("close", () => {
      this._scanning = false;
      this._scanProcess = null;
      this._protogen.logger.info("BluetoothManager", "Bluetooth scan finished");
    });

    proc.on("error", () => {
      this._scanning = false;
      this._scanProcess = null;
    });
  }

  /**
   * Stop an in-progress scan early.
   */
  public async stopScan(): Promise<void> {
    if (this._scanProcess) {
      this._scanProcess.kill();
      this._scanProcess = null;
    }
    this._scanning = false;
  }

  /**
   * Pair with a device by MAC address.
   *
   * Uses an interactive bluetoothctl session so that `agent NoInputNoOutput`,
   * `default-agent`, and `pair` all run within the **same process** — this is
   * required because agent registration is per-session and would be lost if
   * each command were a separate `exec()` call.
   *
   * After a successful pair the device is automatically trusted so it can
   * reconnect on its own in the future.
   */
  public async pairDevice(mac: string): Promise<void> {
    this._protogen.logger.info("BluetoothManager", `Pairing with device: ${mac}`);

    const output = await this.runSession(
      ["agent NoInputNoOutput", "default-agent", `pair ${mac}`],
      {
        timeoutMs: 30_000,
        resolvePattern: /Pairing successful|Failed to pair|AlreadyExists/i,
        autoAcceptPairing: true,
      },
    );

    if (/Failed to pair/i.test(output)) {
      throw new BluetoothError(
        "Failed to pair with device. Make sure the device is in pairing mode.",
        400,
      );
    }

    // Trust the device so it auto-reconnects
    this._protogen.logger.info("BluetoothManager", `Trusting device: ${mac}`);
    await this.exec(`trust ${mac}`).catch(() => {
      this._protogen.logger.warn(
        "BluetoothManager",
        `Could not trust device ${mac} after pairing`,
      );
    });
  }

  /**
   * Unpair (remove) a device by MAC address.
   */
  public async unpairDevice(mac: string): Promise<void> {
    this._protogen.logger.info("BluetoothManager", `Unpairing device: ${mac}`);
    await this.exec(`remove ${mac}`);
  }

  /**
   * Connect to an already-paired device by MAC address.
   */
  public async connectDevice(mac: string): Promise<void> {
    this._protogen.logger.info("BluetoothManager", `Connecting to device: ${mac}`);
    await this.exec(`connect ${mac}`, 20_000);
  }

  /**
   * Disconnect from a device by MAC address.
   */
  public async disconnectDevice(mac: string): Promise<void> {
    this._protogen.logger.info("BluetoothManager", `Disconnecting from device: ${mac}`);
    await this.exec(`disconnect ${mac}`);
  }

  /**
   * Check whether rfkill is soft- or hard-blocking Bluetooth.
   * Returns { softBlocked, hardBlocked }. If rfkill is not available or
   * does not list any Bluetooth device, both fields are false.
   */
  public async getRfkillStatus(): Promise<{ softBlocked: boolean; hardBlocked: boolean }> {
    try {
      const { stdout } = await execAsync("rfkill list bluetooth");
      const softMatch = /Soft blocked:\s+(yes|no)/i.exec(stdout);
      const hardMatch = /Hard blocked:\s+(yes|no)/i.exec(stdout);
      return {
        softBlocked: softMatch?.[1]?.toLowerCase() === "yes",
        hardBlocked: hardMatch?.[1]?.toLowerCase() === "yes",
      };
    } catch {
      // rfkill not installed or returned non-zero — treat as unblocked
      return { softBlocked: false, hardBlocked: false };
    }
  }

  /**
   * Attempt to unblock Bluetooth via rfkill using sudo in non-interactive
   * mode (`sudo -n`). Requires a NOPASSWD sudoers entry for this command.
   */
  public async unblockRfkill(): Promise<void> {
    this._protogen.logger.info("BluetoothManager", "Unblocking Bluetooth via rfkill");
    try {
      await execAsync("sudo -n rfkill unblock bluetooth");
    } catch (err: any) {
      const msg =
        ((err.stderr ?? "") as string).trim() ||
        ((err.stdout ?? "") as string).trim() ||
        "rfkill unblock failed";
      throw new BluetoothError(msg, 500);
    }
  }
}

// ---------------------------------------------------------------------------
//  Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
