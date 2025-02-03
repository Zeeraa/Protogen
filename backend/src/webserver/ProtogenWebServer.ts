import { Protogen } from "../Protogen";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { cyan, yellow } from "colors";
import { existsSync, readFileSync } from "fs";
import swaggerUi from "swagger-ui-express";
import { VideoPlayerRouter } from "./routes/video-player/VideoPlayerRouter";
import { AudioRouter } from "./routes/volume/AudioRouter";
import { VisorRouter } from "./routes/visor/VisorRouter";
import { SystemRouter } from "./routes/system/SystemRouter";
import { RgbRouter } from "./routes/rgb/RgbRouter";
import { createServer } from "http";
import { Server, Socket } from 'socket.io';
import { UserSocketSession } from "./socket/UserSocketSession";
import { SocketMessageType } from "./socket/SocketMessageType";
import { SocketMessage } from "./socket/SocketMessage";
import { HudRouter } from "./routes/hud/HudRouter";
import { ImageRouter } from "./routes/images/ImageRouter";
import { UserRouter } from "./routes/user/UserRouter";
import { AuthRouter } from "./routes/auth/AuthRouter";
import { AuthData, AuthMiddleware, AuthType } from "./middleware/AuthMiddleware";
import { DiscoveryRouter } from "./routes/discovery/DiscoveryRouter";
import { ApiKeyRouter } from "./routes/apikeys/ApiKeyRouter";
import { RemoteRouter } from "./routes/remote/RemoteRouter";
import { KV_EnableSwagger } from "../utils/KVDataStorageKeys";
import { FaceRouter } from "./routes/face/FaceRouter";

export class ProtogenWebServer {
  private _protogen;
  private _express;
  private _http;
  private _socket;
  private _sessions: UserSocketSession[];
  private _authMiddleware;

  constructor(protogen: Protogen) {
    this._protogen = protogen;
    this._sessions = [];

    this._express = express();
    this._http = createServer(this._express);
    this._socket = new Server(this._http, {
      path: "/protogen-websocket.io",
    });

    this._authMiddleware = AuthMiddleware(this);

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
    new RemoteRouter(this).register();
    new FaceRouter(this).register();

    this.socket.on("connection", async (socket: Socket) => {
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
          }
        }
      }

      if (auth == null) {
        this.protogen.logger.info("WebServer", "Invalid token. Disconnecting socket.");
        socket.disconnect(true);
        return;
      }

      const session = new UserSocketSession(this.protogen, socket);
      this._sessions.push(session);
      this.protogen.logger.info("WebServer", "Socket connected with id " + cyan(session.sessionId) + ". Client count: " + cyan(String(this._sessions.length)));
    });

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
          this.protogen.logger.info("WebServer", "Listening on port " + cyan(String(this.config.port)));
        });
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

  public get socket() {
    return this._socket;
  }

  public get authMiddleware() {
    return this._authMiddleware;
  }

  public broadcastMessage(type: SocketMessageType, data: any) {
    const message: SocketMessage = {
      type: type,
      data: data,
    }
    this._socket.emit("message", message);
  }
}