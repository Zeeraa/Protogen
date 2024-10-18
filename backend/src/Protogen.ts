import { existsSync, mkdirSync } from "fs";
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

  constructor(config: Configuration) {
    this._config = config;

    if (!existsSync(this.config.tempDirectory)) {
      mkdirSync(this.config.tempDirectory);
    }

    const videoTempDirectory = this.config.tempDirectory + "/videos";
    if (!existsSync(videoTempDirectory)) {
      mkdirSync(videoTempDirectory);
    }

    this._eventEmitter = new EventEmitter();

    this._logger = new Logger();
    this._database = new Database(this);
    this._webServer = new ProtogenWebServer(this);
    this._flaschenTaschen = new FlaschenTaschen(this.config.flaschenTaschen.host, this.config.flaschenTaschen.port);
    this._visor = new ProtogenVisor(this);
    this._remoteWorker = new ProtogenRemoteWorker(this);
    this._videoPlaybackManager = new ProtogenVideoPlaybackManager(this, videoTempDirectory);
    this._serial = new SerialManager(this);
    this._rgb = new RgbManager(this);
    this._networkManager = new NetworkManager(this);
  }

  public async init() {
    this._networkManager.runConnectivityCheck();
    await this.database.init();
    await this.webServer.init();
    await this.rgb.loadScenes();
    await this.rgb.applyLastScene();
    await this.visor.loadActiveRendererFromDatabase();
    await this.visor.init();
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

  public get netowrkManager() {
    return this._networkManager;
  }

  public get eventEmitter() {
    return this._eventEmitter;
  }
  //#endregion
}