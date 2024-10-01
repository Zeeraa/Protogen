import { Configuration } from "./config/objects/Configurations";
import { Database } from "./database/Database";
import { Logger } from "./logger/Logger";
import { ProtogenRemoteWorker } from "./remote-worker/RemoteWorker";
import { ProtogenVideoPlaybackManager } from "./video-playback-manager/ProtogenVideoPlaybackManager";
import { FlaschenTaschen } from "./visor/flaschen-taschen/FlaschenTaschen";
import { ProtogenVisor } from "./visor/ProtogenVisor";
import { ProtogenWebServer } from "./webserver/ProtogenWebServer";

export class Protogen {
  private _config: Configuration;
  private _database: Database;
  private _webServer: ProtogenWebServer;
  private _logger: Logger;
  private _visor: ProtogenVisor;
  private _flaschenTaschen: FlaschenTaschen;
  private _remoteWorker: ProtogenRemoteWorker;
  private _videoPlaybackManager: ProtogenVideoPlaybackManager;

  constructor(config: Configuration) {
    this._config = config;
    this._logger = new Logger();
    this._database = new Database(this);
    this._webServer = new ProtogenWebServer(this);
    this._flaschenTaschen = new FlaschenTaschen(this.config.flaschenTaschen.host, this.config.flaschenTaschen.port);
    this._visor = new ProtogenVisor(this);
    this._remoteWorker = new ProtogenRemoteWorker(this);
    this._videoPlaybackManager = new ProtogenVideoPlaybackManager(this, "./temp");
  }

  public async init() {
    await this.database.init();
    await this.webServer.init();
    this.logger.info("Protogen", "Protogen::init() finished");

    await this.visor.init(); // Init visor render loop
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
  //#endregion
}