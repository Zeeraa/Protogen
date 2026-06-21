import { existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import { Configuration } from "./config/objects/Configurations";
import { Database } from "./database/Database";
import { Logger } from "./logger/Logger";
import { ProtogenRemoteWorker } from "./remote-worker/RemoteWorker";
import { ProtogenVideoPlaybackManager } from "./video-playback-manager/ProtogenVideoPlaybackManager";
import { FlaschenTaschen } from "./visor/flaschen-taschen/FlaschenTaschen";
import { ProtogenVisor } from "./visor/ProtogenVisor";
import { ProtogenWebServer } from "./webserver/ProtogenWebServer";
import { RgbManager } from "./rgb/RgbManager";
import { NetworkManager } from "./network-manager/NetworkManager";
import EventEmitter from "events";
import { removeTrailingSlash, sleep } from "./utils/Utils";
import { uuidv7 } from "uuidv7";
import { UserManager } from "./user-manager/UserManager";
import { ApiKeyManager } from "./apikeys/ApiKeyManager";
import { BuiltInAsset, BuiltInAssetSchema } from "./assets/BuiltInAsset";
import { z } from "zod";
import { ActionManager } from "./actions/ActionManager";
import { AudioVisualiser } from "./audio-visualiser/AudioVisualiser";
import { magenta, red } from "colors";
import { AppManager } from "./apps/AppManager";
import { PaintApp } from "./apps/paint/PaintApp";
import { HardwareAbstractionLayer } from "./hardware/HardwareAbstractionLayer";
import { HardwareType } from "./hardware/HardwareType";
import { StandardHardwareImplementation } from "./hardware/implementations/StandardHardwareImplementation";
import { HUDManager } from "./hud/HUDManager";
import { SensorManager } from "./sensors/SensorManager";
import { EmulatedHardwareImplementation } from "./hardware/implementations/EmulatedHardwareImplementation";
import { BoopSensorManager } from "./boop-sensor/BoopSensorManager";
import { BluetoothManager } from "./bluetooth/BluetoothManager";
import { InitialSetup } from "./initial-setup/InitialSetup";
import { GamepadManager } from "./gamepadmanager/GamepadManager";
import { MqttManager } from "./mqtt/MqttManager";
import { KV_WorkerKey, KV_WorkerUrl } from "./utils/KVDataStorageKeys";

export const BootMessageColor = "#00FF00";
export const JwtKeyLength = 64;

export class Protogen {
  public readonly config: Configuration;
  public readonly database: Database;
  public readonly webServer: ProtogenWebServer;
  public readonly logger: Logger;
  public readonly visor: ProtogenVisor;
  public readonly flaschenTaschen: FlaschenTaschen;
  public readonly remoteWorker: ProtogenRemoteWorker;
  public readonly videoPlaybackManager: ProtogenVideoPlaybackManager | null;
  public readonly rgb: RgbManager | null;
  public readonly networkManager: NetworkManager;
  public readonly eventEmitter: EventEmitter;
  public readonly userManager: UserManager;
  public readonly apiKeyManager: ApiKeyManager;
  public readonly sessionId: string;
  public readonly videoDirectory: string;
  public readonly imageDirectory: string;
  public readonly tempDirectory: string;
  public readonly builtInAssets: BuiltInAsset[] = [];
  public readonly actionManager: ActionManager;
  public readonly audioVisualiser: AudioVisualiser;
  public readonly versionNumber: string;
  public readonly integrationStateReportingKey: string;
  public readonly appManager: AppManager;
  public readonly boopSensorManager: BoopSensorManager | null;
  public readonly bluetoothManager: BluetoothManager;
  public readonly gamepadManager: GamepadManager;
  public readonly mqttManager: MqttManager;
  public readonly hudManager: HUDManager | null;
  public readonly hardwareAbstractionLayer: HardwareAbstractionLayer;
  public readonly sensorManager: SensorManager;
  private _remoteWorkerUrl: string;
  private _remoteWorkerKey: string | null;
  public interuptLoops = false;
  private shutdownCalled = false;

  constructor(config: Configuration) {
    this.sessionId = uuidv7();
    Object.freeze(this.sessionId);

    this.config = config;

    this.eventEmitter = new EventEmitter();
    this.logger = new Logger(this);

    this.integrationStateReportingKey = uuidv7();

    if (!existsSync(this.config.logDirectory)) {
      mkdirSync(this.config.logDirectory);
    }

    if (existsSync(this.logger.sessionLogFile)) {
      rmSync(this.logger.sessionLogFile);
    }

    if (!existsSync(this.config.dataDirectory)) {
      mkdirSync(this.config.dataDirectory);
    }

    if (!existsSync(this.config.dataDirectory)) {
      mkdirSync(this.config.dataDirectory);
    }

    this.videoDirectory = this.config.dataDirectory + "/videos";
    if (!existsSync(this.videoDirectory)) {
      mkdirSync(this.videoDirectory);
    }

    this.imageDirectory = this.config.dataDirectory + "/images";
    Object.freeze(this.imageDirectory);
    if (!existsSync(this.imageDirectory)) {
      mkdirSync(this.imageDirectory);
    }

    this.tempDirectory = this.config.dataDirectory + "/temp";
    Object.freeze(this.tempDirectory);
    if (existsSync(this.tempDirectory)) {
      rmSync(this.tempDirectory, { recursive: true });
    }
    mkdirSync(this.tempDirectory);

    this.logger.info("Protogen", "Setting up hardware abstraction layer. Selected hardware type: " + magenta(config.hardware));
    switch (config.hardware) {
      case HardwareType.STANDARD:
        this.hardwareAbstractionLayer = new StandardHardwareImplementation(this, config.serial.port, config.serial.baudRate, config.systemFeatures.serial);
        break;

      case HardwareType.EMULATED:
        this.hardwareAbstractionLayer = new EmulatedHardwareImplementation(this);
        break;

      default:
        throw new Error("Unimplemented hardware type: " + config.hardware);
    }

    this.logger.info("Protogen", "Reading built-in assets");

    const raw = JSON.parse(readFileSync("assets/AssetManifest.json").toString());
    const parsedAssets = z.array(BuiltInAssetSchema).safeParse(raw);

    if (!parsedAssets.success) {
      this.logger.error("Protogen", "Failed to read built in assets file at assets/AssetManifest.json");
      console.warn("Issues: ", parsedAssets.error.issues);
      throw new Error("Problem in data structure in assets/AssetManifest.json. See console for more details");
    }

    parsedAssets.data.forEach((asset: BuiltInAsset) => {
      if (!existsSync(asset.path)) {
        throw new Error("Could not find file for asset " + asset.name + " at path " + asset.path);
      }
      this.builtInAssets.push(asset);
    });

    const packageJson = JSON.parse(readFileSync("package.json").toString());
    this.versionNumber = String(packageJson.version || "0.0.0");

    Object.freeze(this.versionNumber);
    Object.freeze(this.builtInAssets);

    this.sensorManager = new SensorManager(this);
    this.database = new Database(this);
    this.userManager = new UserManager(this);
    this.apiKeyManager = new ApiKeyManager(this);
    this.webServer = new ProtogenWebServer(this);
    this.flaschenTaschen = new FlaschenTaschen(this);
    this.visor = new ProtogenVisor(this);
    if (this.config.systemFeatures.hud) {
      this.hudManager = new HUDManager(this);
    } else {
      this.hudManager = null;
    }
    this.remoteWorker = new ProtogenRemoteWorker(this);
    if (this.config.systemFeatures.videoPlayback) {
      this.videoPlaybackManager = new ProtogenVideoPlaybackManager(this);
    }
    if (this.config.systemFeatures.rgb) {
      this.rgb = new RgbManager(this);
    } else {
      this.rgb = null;
    }
    this.audioVisualiser = new AudioVisualiser(this);
    this.networkManager = new NetworkManager(this);
    this.actionManager = new ActionManager(this);
    this.appManager = new AppManager(this);
    if (this.config.systemFeatures.boopSensor) {
      this.boopSensorManager = new BoopSensorManager(this);
    } else {
      this.boopSensorManager = null;
    }
    this.bluetoothManager = new BluetoothManager(this);
    this.mqttManager = new MqttManager(this);
    this.gamepadManager = new GamepadManager(this);
  }

  public async init() {
    this.networkManager.runConnectivityCheck();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit database", BootMessageColor);
    await this.database.init();
    const url = await this.database.getData(KV_WorkerUrl) ?? "http://localhost:3005";
    this._remoteWorkerUrl = removeTrailingSlash(url);
    this._remoteWorkerKey = await this.database.getData(KV_WorkerKey);

    const initialSetup = new InitialSetup(this);
    await initialSetup.checkInitialSetup();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit hardware", BootMessageColor);
    await this.hardwareAbstractionLayer.init();

    if (this.config.systemFeatures.hud) {
      await this.visor.tryRenderTextFrame("BOOTING...\nInit HUD", BootMessageColor);
      await this.hudManager?.init();
    }

    await this.visor.tryRenderTextFrame("BOOTING...\nInit auth", BootMessageColor);
    await this.userManager.init();
    await this.apiKeyManager.load();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit web server", BootMessageColor);
    await this.webServer.init();

    if (this.config.systemFeatures.rgb) {
      await this.visor.tryRenderTextFrame("BOOTING...\nInit RGB", BootMessageColor);
      await this.rgb?.init();
      await this.rgb?.loadScenes();
      await this.rgb?.applyLastScene();
    }

    if (this.config.systemFeatures.videoPlayback) {
      await this.visor.tryRenderTextFrame("BOOTING...\nInit video", BootMessageColor);
      await this.videoPlaybackManager?.removeDeletedCache();
    }

    await this.visor.tryRenderTextFrame("BOOTING...\nInit VISOR", BootMessageColor);
    await this.visor.loadActiveRendererFromDatabase();
    await this.visor.init();

    if (this.config.systemFeatures.boopSensor) {
      await this.visor.tryRenderTextFrame("BOOTING...\nInit sensors", BootMessageColor);
      await this.boopSensorManager?.init();
    }

    await this.visor.tryRenderTextFrame("BOOTING...\nInit audio\nvisualizer", BootMessageColor);
    await this.audioVisualiser.init();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit apps", BootMessageColor);
    await this.appManager.registerApp(new PaintApp(this.appManager));

    await this.visor.tryRenderTextFrame("BOOTING...\nInit MQTT", BootMessageColor);
    await this.mqttManager.init();
    await this.gamepadManager.init();

    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());

    // Custom crash handler
    process.on('uncaughtException', (err) => {
      this.visor.appendRenderLock("Crash");
      this.interuptLoops = true;
      this.hardwareAbstractionLayer?.writeToHUD(["Protogen OS", "Has crashed :(", "Please reboot"]);
      console.error(red("Uncaught exception: "), err);
      console.log("Showing crash message and shutting down");
      this.visor.tryRenderTextFrame("Protogen OS\nHas crashed :(\nPlease reboot", "#FF0000").then(() => {
        process.exit(1);
      });
    });

    await this.visor.tryRenderTextFrame("Protogen OS\nReady!\nv" + this.versionNumber, BootMessageColor);
    await sleep(1000); // Show ready message for 1000ms before starting visor render loop
    this.visor.beginMainLoop();
    this.logger.info("Protogen", "Protogen::init() finished");
  }

  public async gracefulShutdown() {
    if (this.shutdownCalled) {
      return;
    }
    this.shutdownCalled = true;

    this.logger.info("Protogen", "Beginning graceful shutdown...");
    this.interuptLoops = true;

    if (this.hudManager) {
      await this.hudManager.shutdown();
    }

    if (this.rgb) {
      await this.rgb.shutdown();
    }

    if (this.videoPlaybackManager) {
      if (this.videoPlaybackManager.isPlaying) {
        this.videoPlaybackManager.kill();
      }
    }

    this.visor.shutdown();
    await this.visor.tryRenderTextFrame("", "#000000"); // Clear visor

    try {
      if (this.database?.dataSource?.isInitialized) {
        await this.database.dataSource.destroy();
      }
    } catch (err) {
      console.error("Error while shutting down database connection: ", err);
    }

    await sleep(250); // Allow for some time to send out the clear frame and serial port commands before shutting down hardware

    this.logger.info("Protogen", "Graceful shutdown complete. Exiting process.");
    process.exit(0);
  }

  public get remoteWorkerUrl() {
    return this._remoteWorkerUrl;
  }

  public get remoteWorkerKey() {
    return this._remoteWorkerKey;
  }
}
