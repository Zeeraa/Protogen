import { existsSync, mkdirSync, rmSync } from "fs";
import { Configuration } from "./config/objects/Configurations";
import { Database } from "./database/Database";
import { Logger } from "./logger/Logger";
import { ProtogenRemoteWorker } from "./remote-worker/RemoteWorker";
import { ProtogenVideoPlaybackManager } from "./video-playback-manager/ProtogenVideoPlaybackManager";
import { FlaschenTaschen } from "./visor/flaschen-taschen/FlaschenTaschen";
import { ProtogenVisor } from "./visor/ProtogenVisor";
import { ProtogenWebServer } from "./webserver/ProtogenWebServer";
import { SerialManager } from "./serial/SerialManager";
import { RgbManager } from "./rgb/RgbManager";
import { NetworkManager } from "./network-manager/NetworkManager";
import EventEmitter from "events";
import { RedisManager } from "./redis/RedisManager";
import { sleep } from "./utils/Utils";
import { uuidv7 } from "uuidv7";
import { UserManager } from "./user-manager/UserManager";

export const VersionNumber = "0.0.1";
export const BootMessageColor = "#00FF00";

export class Protogen {
  private _config: Configuration;
  private _database: Database;
  private _webServer: ProtogenWebServer;
  private _logger: Logger;
  private _visor: ProtogenVisor;
  private _flaschenTaschen: FlaschenTaschen;
  private _remoteWorker: ProtogenRemoteWorker;
  private _videoPlaybackManager: ProtogenVideoPlaybackManager;
  private _serial: SerialManager;
  private _rgb: RgbManager;
  private _networkManager: NetworkManager;
  private _eventEmitter: EventEmitter;
  private _redis: RedisManager;
  private _userManager: UserManager;
  private _sessionId: string;
  private _imageDirectory: string;
  private _tempDirectory: string;

  constructor(config: Configuration) {
    this._sessionId = uuidv7();
    Object.freeze(this._sessionId);

    this._config = config;

    this._eventEmitter = new EventEmitter();
    this._logger = new Logger(this);

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

    this._database = new Database(this);
    this._userManager = new UserManager(this);
    this._webServer = new ProtogenWebServer(this);
    this._flaschenTaschen = new FlaschenTaschen(this);
    this._visor = new ProtogenVisor(this);
    this._remoteWorker = new ProtogenRemoteWorker(this);
    this._videoPlaybackManager = new ProtogenVideoPlaybackManager(this, videoTempDirectory);
    this._serial = new SerialManager(this);
    this._rgb = new RgbManager(this);
    this._networkManager = new NetworkManager(this);
    this._redis = new RedisManager(this);
  }

  public async init() {
    await this.visor.tryRenderTextFrame("BOOTING...\nInit database", BootMessageColor);
    this._networkManager.runConnectivityCheck();
    await this.database.init();
    await this.visor.tryRenderTextFrame("BOOTING...\nInit auth", BootMessageColor);
    await this.userManager.init();
    await this.visor.tryRenderTextFrame("BOOTING...\nInit web server", BootMessageColor);
    await this.webServer.init();
    await this.visor.tryRenderTextFrame("BOOTING...\nInit RGB", BootMessageColor);
    await this.rgb.init();
    await this.rgb.loadScenes();
    await this.rgb.applyLastScene();
    await this.visor.tryRenderTextFrame("BOOTING...\nInit VISOR", BootMessageColor);
    await this.visor.loadActiveRendererFromDatabase();
    await this.visor.init();
    await this.visor.tryRenderTextFrame("BOOTING...\nInit serial\nconnection", BootMessageColor);
    await this.serial.init();
    await this.visor.tryRenderTextFrame("Protogen OS\nReady!\nv" + VersionNumber, BootMessageColor);
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

  public get serial() {
    return this._serial;
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

  public get redis() {
    return this._redis;
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
  //#endregion
}