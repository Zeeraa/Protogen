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
import { sleep } from "./utils/Utils";
import { uuidv7 } from "uuidv7";
import { UserManager } from "./user-manager/UserManager";
import { ApiKeyManager } from "./apikeys/ApiKeyManager";
import { BuiltInAsset, BuiltInAssetSchema } from "./assets/BuiltInAsset";
import { z } from "zod";
import { ActionManager } from "./actions/ActionManager";
import { AudioVisualiser } from "./audio-visualiser/AudioVisualiser";
import { magenta, red } from "colors";
import { JoystickRemoteManager } from "./remote/RemoteManager";
import { AppManager } from "./apps/AppManager";
import { PaintApp } from "./apps/paint/PaintApp";
import { HardwareAbstractionLayer } from "./hardware/HardwareAbstractionLayer";
import { HardwareType } from "./hardware/HardwareType";
import { StandardHardwareImplementation } from "./hardware/implementations/StandardHardwareImplementation";
import { HUDManager } from "./hud/HUDManager";
import { SensorManager } from "./sensors/SensorManager";
import { EmulatedHardwareImplementation } from "./hardware/implementations/EmulatedHardwareImplementation";
import { BoopSensorManager } from "./boop-sensor/BoopSensorManager";
import { InitialSetup } from "./initial-setup/InitialSetup";

export const BootMessageColor = "#00FF00";
export const JwtKeyLength = 64;

export class Protogen {
  private readonly _config: Configuration;
  private readonly _database: Database;
  private readonly _webServer: ProtogenWebServer;
  private readonly _logger: Logger;
  private readonly _visor: ProtogenVisor;
  private readonly _flaschenTaschen: FlaschenTaschen;
  private readonly _remoteWorker: ProtogenRemoteWorker;
  private readonly _videoPlaybackManager: ProtogenVideoPlaybackManager;
  private readonly _rgb: RgbManager;
  private readonly _networkManager: NetworkManager;
  private readonly _eventEmitter: EventEmitter;
  private readonly _userManager: UserManager;
  private readonly _apiKeyManager: ApiKeyManager;
  private readonly _joystickRemoteManager: JoystickRemoteManager;
  private readonly _sessionId: string;
  private readonly _imageDirectory: string;
  private readonly _tempDirectory: string;
  private readonly _builtInAssets: BuiltInAsset[] = [];
  private readonly _actionManager: ActionManager;
  private readonly _audioVisualiser: AudioVisualiser;
  private readonly _versionNumber: string;
  private readonly _integrationStateReportingKey: string;
  private readonly _appManager: AppManager;
  private readonly _boopSensorManager: BoopSensorManager;
  private _hudManager: HUDManager;
  private readonly _hardwareAbstractionLayer: HardwareAbstractionLayer;
  private readonly _sensorManager: SensorManager;
  public interuptLoops = false;

  constructor(config: Configuration) {
    this._sessionId = uuidv7();
    Object.freeze(this._sessionId);

    this._config = config;

    this._eventEmitter = new EventEmitter();
    this._logger = new Logger(this);

    this._integrationStateReportingKey = uuidv7();

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

    const animationCacheDirectory = this.config.dataDirectory + "/animcache";
    if (!existsSync(animationCacheDirectory)) {
      mkdirSync(animationCacheDirectory);
    }

    const videoTempDirectory = this.config.dataDirectory + "/videos";
    if (!existsSync(videoTempDirectory)) {
      mkdirSync(videoTempDirectory);
    }

    this._imageDirectory = this.config.dataDirectory + "/images";
    Object.freeze(this._imageDirectory);
    if (!existsSync(this.imageDirectory)) {
      mkdirSync(this.imageDirectory);
    }

    this._tempDirectory = this.config.dataDirectory + "/temp";
    Object.freeze(this._tempDirectory);
    if (!existsSync(this.tempDirectory)) {
      mkdirSync(this.tempDirectory);
    }

    this.logger.info("Protogen", "Setting up hardware abstraction layer. Selected hardware type: " + magenta(config.hardware));
    switch (config.hardware) {
      case HardwareType.STANDARD:
        this._hardwareAbstractionLayer = new StandardHardwareImplementation(this, config.serial.port, config.serial.baudRate);
        break;

      case HardwareType.EMULATED:
        this._hardwareAbstractionLayer = new EmulatedHardwareImplementation(this);
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
      this._builtInAssets.push(asset);
    });

    const packageJson = JSON.parse(readFileSync("package.json").toString());
    this._versionNumber = String(packageJson.version || "0.0.0");

    Object.freeze(this._versionNumber);
    Object.freeze(this._builtInAssets);

    this._sensorManager = new SensorManager(this);
    this._database = new Database(this);
    this._userManager = new UserManager(this);
    this._apiKeyManager = new ApiKeyManager(this);
    this._webServer = new ProtogenWebServer(this);
    this._flaschenTaschen = new FlaschenTaschen(this);
    this._visor = new ProtogenVisor(this);
    this._hudManager = new HUDManager(this);
    this._remoteWorker = new ProtogenRemoteWorker(this);
    this._videoPlaybackManager = new ProtogenVideoPlaybackManager(this, videoTempDirectory);
    this._rgb = new RgbManager(this);
    this._audioVisualiser = new AudioVisualiser(this);
    this._networkManager = new NetworkManager(this);
    this._joystickRemoteManager = new JoystickRemoteManager(this);
    this._actionManager = new ActionManager(this);
    this._appManager = new AppManager(this);
    this._boopSensorManager = new BoopSensorManager(this);
  }

  public async init() {
    this.networkManager.runConnectivityCheck();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit database", BootMessageColor);
    await this.database.init();

    const initialSetup = new InitialSetup(this);
    await initialSetup.checkInitialSetup();

    await this.joystickRemoteManager.loadConfig();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit hardware", BootMessageColor);
    await this.hardwareAbstractionLayer.init();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit HUD", BootMessageColor);
    await this.hudManager.init();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit auth", BootMessageColor);
    await this.userManager.init();
    await this.apiKeyManager.load();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit web server", BootMessageColor);
    await this.webServer.init();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit RGB", BootMessageColor);
    await this.rgb.init();
    await this.rgb.loadScenes();
    await this.rgb.applyLastScene();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit video", BootMessageColor);
    await this.videoPlaybackManager.removeDeletedCache();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit VISOR", BootMessageColor);
    await this.visor.loadActiveRendererFromDatabase();
    await this.visor.init();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit sensors", BootMessageColor);
    await this.boopSensorManager.init();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit audio\nvisualizer", BootMessageColor);
    await this.audioVisualiser.init();

    await this.visor.tryRenderTextFrame("BOOTING...\nInit apps", BootMessageColor);
    await this.appManager.registerApp(new PaintApp(this.appManager));

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

  //#region Getters
  public get config() {
    return this._config;
  }

  public get database() {
    return this._database;
  }

  public get webServer() {
    return this._webServer;
  }

  public get logger() {
    return this._logger;
  }

  public get visor() {
    return this._visor;
  }

  public get flaschenTaschen() {
    return this._flaschenTaschen;
  }

  public get remoteWorker() {
    return this._remoteWorker;
  }

  public get videoPlaybackManager() {
    return this._videoPlaybackManager;
  }

  public get rgb() {
    return this._rgb;
  }

  public get networkManager() {
    return this._networkManager;
  }

  public get eventEmitter() {
    return this._eventEmitter;
  }

  public get sessionId() {
    return this._sessionId;
  }

  public get imageDirectory() {
    return this._imageDirectory;
  }

  public get tempDirectory() {
    return this._tempDirectory;
  }

  public get userManager() {
    return this._userManager;
  }

  public get apiKeyManager() {
    return this._apiKeyManager;
  }

  public get joystickRemoteManager() {
    return this._joystickRemoteManager;
  }

  public get builtInAssets() {
    return this._builtInAssets;
  }

  public get actionManager() {
    return this._actionManager;
  }

  get audioVisualiser() {
    return this._audioVisualiser;
  }

  get versionNumber() {
    return this._versionNumber;
  }

  public get integrationStateReportingKey() {
    return this._integrationStateReportingKey;
  }

  public get appManager() {
    return this._appManager;
  }

  get hardwareAbstractionLayer() {
    return this._hardwareAbstractionLayer;
  }

  get hudManager() {
    return this._hudManager;
  }

  get sensorManager() {
    return this._sensorManager;
  }

  public get boopSensorManager() {
    return this._boopSensorManager;
  }
  //#endregion
}
