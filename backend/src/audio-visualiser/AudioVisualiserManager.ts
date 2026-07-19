import { ChildProcess, spawn } from "child_process";
import { Protogen } from "../Protogen";
import { existsSync } from "fs";
import { resolve as pathResolve } from "path";
import { SocketMessageType } from "../webserver/socket/SocketMessageType";

const DATA_TOPIC = "protogen/audio-visualizer/data";
const CONFIG_TOPIC = "protogen/audio-visualizer/config";

export interface AudioVisualizerData {
  timestamp: number;
  intensity: number;
  bands: {
    sub_bass: number;
    bass: number;
    low_mids: number;
    mids: number;
    high_mids: number;
    highs: number;
    presence: number;
  };
  beat: boolean;
}

export interface AudioVisualizerConfig {
  enabled: boolean;
  deviceIndex: number | null;
  lowThreshold: number;
  intensity: number;
}

export class AudioVisualiserManager {
  private readonly _protogen: Protogen;
  private _process: ChildProcess | null = null;
  private _config: AudioVisualizerConfig;
  private _latestData: AudioVisualizerData | null = null;
  private _isRunning = false;
  private readonly _pythonScriptPath: string;
  private readonly _pythonExecutable: string;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._config = {
      enabled: false,
      deviceIndex: null,
      lowThreshold: 0.02,
      intensity: 2.0,
    };

    // Use venv python if available, fallback to system python3
    const venvPython = pathResolve("../audio_visualizer/venv/bin/python3");
    this._pythonExecutable = existsSync(venvPython) ? venvPython : "python3";
    this._pythonScriptPath = pathResolve("../audio_visualizer/audio_listener.py");
  }

  public get protogen(): Protogen {
    return this._protogen;
  }

  public get config(): AudioVisualizerConfig {
    return { ...this._config };
  }

  public get latestData(): AudioVisualizerData | null {
    return this._latestData ? { ...this._latestData } : null;
  }

  public get isRunning(): boolean {
    return this._isRunning && this._process !== null;
  }

  public async init(): Promise<void> {
    // Load config from database
    await this.loadConfigFromDatabase();

    // Subscribe to MQTT audio data
    this._protogen.mqttManager.subscribe(DATA_TOPIC, (topic, message) => {
      try {
        const data = JSON.parse(message.toString()) as AudioVisualizerData;
        //console.debug("got data:", data);
        this._latestData = data;

        // Broadcast to connected web clients via Socket.io
        this._protogen.webServer.socketSessions.forEach(session => {
          if (session.enableAudioPreview) {
            session.sendMessage(SocketMessageType.S2C_AudioVisualizerData, data);
          }
        });
      } catch (err) {
        this._protogen.logger.error("AudioVisualiser", "Failed to parse audio data: " + String(err));
      }
    });

    // Auto-start if enabled
    if (this._config.enabled) {
      await this.start();
    }

    this._protogen.logger.info("AudioVisualiser", "Initialized");
  }

  public async start(): Promise<void> {
    if (this._isRunning) {
      this._protogen.logger.warn("AudioVisualiser", "Already running");
      return;
    }

    if (!existsSync(this._pythonScriptPath)) {
      throw new Error(`Python script not found at ${this._pythonScriptPath}`);
    }

    const args = [
      this._pythonScriptPath,
      "--low-threshold", String(this._config.lowThreshold),
      "--intensity", String(this._config.intensity),
      "--mqtt-host", this._protogen.config.mqtt.host,
      "--mqtt-port", String(this._protogen.config.mqtt.port),
      "--mqtt-topic", DATA_TOPIC,
      "--mqtt-config-topic", CONFIG_TOPIC,
    ];

    if (this._config.deviceIndex !== null) {
      args.push("--device", String(this._config.deviceIndex));
    }

    this._protogen.logger.info("AudioVisualiser", "Starting Python listener process...");
    this._protogen.logger.info("AudioVisualiser", `Using Python: ${this._pythonExecutable}`);
    this._protogen.logger.info("AudioVisualiser", "Command: " + this._pythonExecutable + " " + args.join(" "));

    this._process = spawn(this._pythonExecutable, args, {
      cwd: pathResolve("../audio_visualizer"),
    });

    this._process.stdout?.on("data", (data) => {
      const output = data.toString().trim();
      this._protogen.logger.info("AudioVisualiser", output);
    });

    this._process.stderr?.on("data", (data) => {
      const output = data.toString().trim();
      this._protogen.logger.error("AudioVisualiser", output);
    });

    this._process.on("exit", (code, signal) => {
      this._protogen.logger.warn("AudioVisualiser", `Process exited with code ${code}, signal ${signal}`);
      this._isRunning = false;
      this._process = null;

      // Auto-restart if it was supposed to be enabled
      if (this._config.enabled && code !== 0) {
        this._protogen.logger.info("AudioVisualiser", "Auto-restarting in 5 seconds...");
        setTimeout(() => {
          if (this._config.enabled) {
            this.start().catch(err => {
              this._protogen.logger.error("AudioVisualiser", "Failed to restart: " + String(err));
            });
          }
        }, 5000);
      }
    });

    this._process.on("error", (err) => {
      this._protogen.logger.error("AudioVisualiser", "Process error: " + err.message);
      this._isRunning = false;
      this._process = null;
    });

    this._isRunning = true;
    this._config.enabled = true;
    await this.saveConfigToDatabase();
  }

  public async stop(): Promise<void> {
    if (!this._isRunning || !this._process) {
      this._protogen.logger.warn("AudioVisualiser", "Not running");
      return;
    }

    this._protogen.logger.info("AudioVisualiser", "Stopping Python listener process...");
    this._config.enabled = false;
    await this.saveConfigToDatabase();

    this._process.kill("SIGTERM");

    // Give it 3 seconds to shut down gracefully, then force kill
    setTimeout(() => {
      if (this._process && !this._process.killed) {
        this._protogen.logger.warn("AudioVisualiser", "Force killing process");
        this._process.kill("SIGKILL");
      }
    }, 3000);

    this._isRunning = false;
    this._process = null;
  }

  public async updateConfig(config: Partial<AudioVisualizerConfig>): Promise<void> {
    const needsRestart = config.deviceIndex !== undefined && config.deviceIndex !== this._config.deviceIndex;
    const wasEnabled = this._config.enabled;

    // Update config
    if (config.deviceIndex !== undefined) {
      this._config.deviceIndex = config.deviceIndex;
    }
    if (config.lowThreshold !== undefined) {
      this._config.lowThreshold = config.lowThreshold;
    }
    if (config.intensity !== undefined) {
      this._config.intensity = config.intensity;
    }
    if (config.enabled !== undefined) {
      this._config.enabled = config.enabled;
    }

    await this.saveConfigToDatabase();

    // Handle enabled state changes
    if (config.enabled !== undefined && config.enabled !== wasEnabled) {
      if (this._config.enabled) {
        // Start the visualizer
        await this.start();
      } else {
        // Stop the visualizer
        await this.stop();
      }
    } else if (this._isRunning) {
      // If already running, handle config changes
      if (needsRestart) {
        // Device change requires restart
        await this.stop();
        if (this._config.enabled) {
          await this.start();
        }
      } else {
        // Push live config update via MQTT
        this._protogen.mqttManager.publish(CONFIG_TOPIC, JSON.stringify({
          lowThreshold: this._config.lowThreshold,
          intensity: this._config.intensity,
          enabled: this._config.enabled,
        }));
      }
    }
  }

  public async listAudioDevices(): Promise<AudioDevice[]> {
    return new Promise((resolvePromise, rejectPromise) => {
      const process = spawn(this._pythonExecutable, [this._pythonScriptPath, "--list-devices"], {
        cwd: pathResolve("../audio_visualizer"),
      });

      let output = "";

      process.stdout?.on("data", (data: Buffer) => {
        output += data.toString();
      });

      process.stderr?.on("data", (data: Buffer) => {
        output += data.toString();
      });

      process.on("exit", (code: number | null) => {
        if (code === 0) {
          // Parse device list from output
          const devices = this.parseDeviceList(output);
          resolvePromise(devices);
        } else {
          rejectPromise(new Error("Failed to list audio devices"));
        }
      });

      process.on("error", (err: Error) => {
        rejectPromise(err);
      });
    });
  }

  private parseDeviceList(output: string): AudioDevice[] {
    const devices: AudioDevice[] = [];
    const lines = output.split("\n");

    let currentDevice: Partial<AudioDevice> | null = null;

    for (const line of lines) {
      const deviceMatch = line.match(/^Device (\d+): (.+)$/);
      if (deviceMatch) {
        if (currentDevice && currentDevice.index !== undefined) {
          devices.push(currentDevice as AudioDevice);
        }
        currentDevice = {
          index: parseInt(deviceMatch[1]),
          name: deviceMatch[2].trim(),
        };
      } else if (currentDevice) {
        const sampleRateMatch = line.match(/Sample Rate: (\d+) Hz/);
        if (sampleRateMatch) {
          currentDevice.sampleRate = parseInt(sampleRateMatch[1]);
        }

        const channelsMatch = line.match(/Input Channels: (\d+)/);
        if (channelsMatch) {
          currentDevice.channels = parseInt(channelsMatch[1]);
        }
      }
    }

    if (currentDevice && currentDevice.index !== undefined) {
      devices.push(currentDevice as AudioDevice);
    }

    return devices;
  }

  private async loadConfigFromDatabase(): Promise<void> {
    const enabled = await this._protogen.database.getData("AudioVisualiser_Enabled");
    const deviceIndex = await this._protogen.database.getData("AudioVisualiser_DeviceIndex");
    const lowThreshold = await this._protogen.database.getData("AudioVisualiser_LowThreshold");
    const intensity = await this._protogen.database.getData("AudioVisualiser_Intensity");
    const sensitivity = await this._protogen.database.getData("AudioVisualiser_Sensitivity");

    if (enabled !== null) {
      this._config.enabled = enabled === "true";
    }
    if (deviceIndex !== null && deviceIndex !== "null") {
      this._config.deviceIndex = parseInt(deviceIndex);
    }

    this._config.lowThreshold = lowThreshold !== null ? parseFloat(lowThreshold) : 0.02;

    if (intensity !== null) {
      this._config.intensity = parseFloat(intensity);
    } else if (sensitivity !== null) {
      this._config.intensity = parseFloat(sensitivity);
    } else {
      this._config.intensity = 2.0;
    }
  }

  private async saveConfigToDatabase(): Promise<void> {
    await this._protogen.database.setData("AudioVisualiser_Enabled", String(this._config.enabled));
    await this._protogen.database.setData("AudioVisualiser_DeviceIndex", this._config.deviceIndex === null ? "null" : String(this._config.deviceIndex));
    await this._protogen.database.setData("AudioVisualiser_LowThreshold", String(this._config.lowThreshold));
    await this._protogen.database.setData("AudioVisualiser_Intensity", String(this._config.intensity));
  }

  public async shutdown(): Promise<void> {
    if (this._isRunning) {
      await this.stop();
    }
  }
}

export interface AudioDevice {
  index: number;
  name: string;
  sampleRate?: number;
  channels?: number;
}
