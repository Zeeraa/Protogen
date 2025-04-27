import { Protogen } from "../Protogen";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { cyan, green, yellow } from "colors";
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync } from "fs";
import swaggerUi from "swagger-ui-express";
import { VideoPlayerRouter } from "./routes/video-player/VideoPlayerRouter";
import { AudioRouter } from "./routes/volume/AudioRouter";
import { VisorRouter } from "./routes/visor/VisorRouter";
import { SystemRouter } from "./routes/system/SystemRouter";
import { RgbRouter } from "./routes/rgb/RgbRouter";
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import * as https from 'https';
import { Server, Socket } from 'socket.io';
import { UserSocketSession } from "./socket/UserSocketSession";
import { SocketMessageType } from "./socket/SocketMessageType";
import { HudRouter } from "./routes/hud/HudRouter";
import { ImageRouter } from "./routes/images/ImageRouter";
import { UserRouter } from "./routes/user/UserRouter";
import { AuthRouter } from "./routes/auth/AuthRouter";
import { AuthData, AuthMiddleware, AuthType } from "./middleware/AuthMiddleware";
import { DiscoveryRouter } from "./routes/discovery/DiscoveryRouter";
import { ApiKeyRouter } from "./routes/apikeys/ApiKeyRouter";
import { KV_EnableSwagger } from "../utils/KVDataStorageKeys";
import { FaceRouter } from "./routes/face/FaceRouter";
import { AssetsRouter } from "./routes/assets/AssetsRouter";
import { resolve } from "path";
import { generateNewCertificate, getCertificateExpiry } from "../utils/Utils";
import { ActionsRouter } from "./routes/actions/ActionsRouter";
import morgan from 'morgan';
import { AudioVisualiserRouter } from "./routes/audio-visualizer/AudioVisualizerRouter";
import { JoystickRemoteRouter } from "./routes/remote/JoystickRemoteRouter";
import { AppRouter } from "./routes/apps/AppRouter";

export const SocketPath = "/protogen-websocket.io";

export class ProtogenWebServer {
  private _protogen;
  private _express;
  private _http;
  private _https: https.Server | null = null;
  private _socket;
  private _socketSecure: Server | null = null;
  private _sessions: UserSocketSession[];
  private _authMiddleware;

  private _internalHttpsPublicKeyFile: string;
  private _internalHttpsPrivateKeyFile: string;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._sessions = [];

    const certFolder = resolve(protogen.config.dataDirectory + "/cert");
    if (!existsSync(certFolder)) {
      protogen.logger.info("WebServer", "Creating certificate folder");
      mkdirSync(certFolder);
    }
    this._internalHttpsPublicKeyFile = certFolder + "/cert_selfsigned.pub";
    this._internalHttpsPrivateKeyFile = certFolder + "/cert_selfsigned.pem";

    let certGenerationNeeded = false;

    if (!existsSync(this._internalHttpsPublicKeyFile) || !existsSync(this._internalHttpsPrivateKeyFile)) {
      this.protogen.logger.info("WebServer", "Self signed certificate not found");
      certGenerationNeeded = true;
    } else {
      const expiresAt = getCertificateExpiry(this._internalHttpsPublicKeyFile);
      if (expiresAt.getTime() - Date.now() < 1000 * 60 * 60 * 24 * 3) {
        this.protogen.logger.info("WebServer", "Self signed certificate is expiring in 3 days. Creating a new one");
        certGenerationNeeded = true;
      }
    }

    if (certGenerationNeeded) {
      this.protogen.logger.info("WebServer", "Generating self signed certificate for secure local communication");
      if (existsSync(this._internalHttpsPublicKeyFile)) {
        rmSync(this._internalHttpsPublicKeyFile);
      }

      if (existsSync(this._internalHttpsPrivateKeyFile)) {
        rmSync(this._internalHttpsPrivateKeyFile);
      }

      generateNewCertificate(this._internalHttpsPrivateKeyFile, this._internalHttpsPublicKeyFile, 30);
    }


    this._express = express();
    this._http = createHttpServer(this._express);

    this._socket = new Server(this._http, {
      path: SocketPath,
    });

    if (protogen.config.web.localHttpsPort != null) {
      this._https = createHttpsServer({
        key: readFileSync(this._internalHttpsPrivateKeyFile),
        cert: readFileSync(this._internalHttpsPublicKeyFile),
      }, this._express);

      console.debug("Creating socket for https");
      this._socketSecure = new Server(this._https, {
        path: SocketPath,
      });
    }

    this._authMiddleware = AuthMiddleware(this);

    const logStream = createWriteStream(this.protogen.config.logDirectory + "/web.log", { flags: 'a' });
    this.express.use(morgan('combined', { stream: logStream }));

    if (String(process.env["LOG_REQUESTS_IN_CONSOLE"]).toLowerCase() == "true") {
      // Use morgan to log all requests
      this.express.use(morgan('combined'));
    }

    this.express.use(cors())
    this.express.use(bodyParser.json());

    new VideoPlayerRouter(this).register();
    new AudioRouter(this).register();
    new VisorRouter(this).register();
    new SystemRouter(this).register();
    new RgbRouter(this).register();
    new HudRouter(this).register();
    new ImageRouter(this).register({ noAuth: true });
    new UserRouter(this).register();
    new AuthRouter(this).register({ noAuth: true });
    new DiscoveryRouter(this).register({ noAuth: true });
    new ApiKeyRouter(this).register();
    new JoystickRemoteRouter(this).register();
    new FaceRouter(this).register();
    new AssetsRouter(this).register({ noAuth: true });
    new ActionsRouter(this).register();
    new AudioVisualiserRouter(this).register();
    new AppRouter(this).register();

    const socketConnectionHandler = async (socket: Socket) => {
      const token = String(socket.handshake.headers.authorization);
      let auth: AuthData | null = null;

      if (token.startsWith("Bearer ")) {
        const jwt = token.split("Bearer ")[1];
        const user = await this.protogen.userManager.validateJWTToken(jwt);

        if (user != null) {
          auth = {
            type: AuthType.Token,
            isSuperUser: user.superUser,
            user: user,
            onlyRemotePermissions: false,
          }
        }
      } else if (token.startsWith("Key ")) {
        const keyString = token.split("Key ")[1];
        const apiKey = this.protogen.apiKeyManager.keys.find(k => k.apiKey == keyString);

        if (apiKey != null) {
          auth = {
            type: AuthType.ApiKey,
            isSuperUser: apiKey.superUser,
            user: null,
            onlyRemotePermissions: false,
          }
        }
      } else if (token.startsWith("RemoteKey ")) {
        const keyString = token.split("RemoteKey ")[1];
        if (keyString == this.protogen.integrationStateReportingKey) {
          auth = {
            type: AuthType.Remote,
            isSuperUser: false,
            user: null,
            onlyRemotePermissions: true,
          }
        }
      }

      if (auth == null) {
        this.protogen.logger.info("WebServer", "Invalid token. Disconnecting socket.");
        socket.disconnect(true);
        return;
      }

      const session = new UserSocketSession(this.protogen, socket, auth);
      this._sessions.push(session);
      this.protogen.logger.info("WebServer", "Socket connected with id " + cyan(session.sessionId) + ". Client count: " + cyan(String(this._sessions.length)));
    }

    this.socket.on("connection", socketConnectionHandler);
    this.socketSecure?.on("connection", socketConnectionHandler);

    setInterval(() => {
      this.broadcastMessage(SocketMessageType.S2C_Ping, {});
    }, 5000);
  }

  public disconnectSocket(session: UserSocketSession) {
    session.disconnect();
    this._sessions = this._sessions.filter(s => s.sessionId != session.sessionId);
    this.protogen.logger.info("WebServer", "Socket with id " + cyan(session.sessionId) + " disconnected. Client count: " + cyan(String(this._sessions.length)));
  }

  public init() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const swaggerEnabled = (await this.protogen.database.getData(KV_EnableSwagger)) == "true";
        this.protogen.logger.info("WebServer", "Swagger " + (swaggerEnabled ? "enabled" : "disabled"));
        if (swaggerEnabled) {
          if (existsSync("./swagger.json")) {
            this.protogen.logger.info("WebServer", "Reading swagger.json");
            const swagger = JSON.parse(readFileSync("./swagger.json").toString());
            this.express.use("/", swaggerUi.serve, swaggerUi.setup(swagger));
          } else {
            this.protogen.logger.warn("WebServer", yellow("Could not find swagger.json. No api documentation will be available"));
          }
        }

        this._http.listen(this.config.port, () => {
          this.protogen.logger.info("WebServer", "[" + green("HTTP") + "] Listening on port " + cyan(String(this.config.port)));
        });

        if (this._https != null) {
          this._https.listen(this.protogen.config.web.localHttpsPort, () => {
            this.protogen.logger.info("WebServer", "[" + green("HTTPS") + "] Listening on port " + cyan(String(this.protogen.config.web.localHttpsPort)));
          });
        }

        resolve();
      } catch (err) {
        this.protogen.logger.error("WebServer", "Failed to start express");
        reject(err);
      }
    });
  }

  public get socketSessions() {
    return this._sessions;
  }

  private get config() {
    return this.protogen.config.web;
  }

  public get express() {
    return this._express;
  }

  public get protogen() {
    return this._protogen;
  }

  public get internalHttpsPublicKeyFile() {
    return this._internalHttpsPublicKeyFile;
  }

  public get isLocalHttpsServerRunning() {
    return this._https != null;
  }

  public get socket() {
    return this._socket;
  }

  public get socketSecure() {
    return this._socketSecure;
  }

  public get authMiddleware() {
    return this._authMiddleware;
  }

  public broadcastMessage(type: SocketMessageType, data: any) {
    this.socketSessions.filter(s => !s.auth.onlyRemotePermissions || (type == SocketMessageType.S2E_JoystickRemoteConfigChange || type == SocketMessageType.S2E_JoystickRemoteProfileChange)).forEach(s => s.sendMessage(type, data));
  }
}
